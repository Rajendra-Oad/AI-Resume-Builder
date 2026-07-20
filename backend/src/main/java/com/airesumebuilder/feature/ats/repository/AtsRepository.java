package com.airesumebuilder.feature.ats.repository;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.ats.service.AtsScoringEngine.KeywordResult;
import com.airesumebuilder.feature.ats.service.AtsService;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AtsRepository {
    private final JdbcTemplate jdbc;
    public AtsRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public AnalysisInput input(String email, long resumeId, long jobId) {
        List<AnalysisInput> rows = jdbc.query("""
            SELECT r.id resume_id, j.id job_id,
                   CONCAT_WS(' ', r.title, r.summary, r.target_job_title,
                     GROUP_CONCAT(CONCAT_WS(' ', e.institution,e.degree,x.employer,x.role,p.name,p.description,s.name,s.proficiency_level,c.name,c.issued_by) SEPARATOR ' ')) resume_content,
                   CONCAT_WS(' ', j.title,j.company_name,j.content,j.extracted_skills) job_content
            FROM resumes r JOIN users u ON u.id=r.user_id
            JOIN job_descriptions j ON j.id=? AND j.deleted_at IS NULL AND (j.user_id=u.id OR j.user_id IS NULL)
            LEFT JOIN resume_sections rs ON rs.resume_id=r.id
            LEFT JOIN educations e ON e.id=rs.id LEFT JOIN experiences x ON x.id=rs.id
            LEFT JOIN projects p ON p.id=rs.id LEFT JOIN skills s ON s.id=rs.id LEFT JOIN certifications c ON c.id=rs.id
            WHERE u.email=? AND r.id=? AND r.deleted_at IS NULL GROUP BY r.id,j.id
            """, (rs,n)->new AnalysisInput(rs.getLong("resume_id"),rs.getLong("job_id"),rs.getString("resume_content"),rs.getString("job_content")), jobId,email,resumeId);
        return rows.stream().findFirst().orElseThrow(()->new ResourceNotFoundException("Resume or job description not found."));
    }

    public long save(AnalysisInput input, BigDecimal score, List<KeywordResult> keywords) {
        jdbc.update("INSERT INTO ats_reports(resume_id,job_description_id,overall_score,created_at) VALUES (?,?,?,NOW(6))",input.resumeId(),input.jobId(),score);
        Long id=jdbc.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
        for(KeywordResult keyword:keywords){jdbc.update("INSERT INTO ats_keyword_matches(ats_report_id,keyword,found_in_resume,importance_weight) VALUES (?,?,?,1.000)",id,keyword.keyword(),keyword.found());if(!keyword.found())jdbc.update("INSERT INTO ats_missing_skills(ats_report_id,skill_name,suggested_action) VALUES (?,?,?)",id,keyword.keyword(),"Add this skill only when it accurately reflects your experience.");}
        if(score.compareTo(new BigDecimal("70"))<0)jdbc.update("INSERT INTO ats_recommendations(ats_report_id,category,recommendation_text) VALUES (?,'KEYWORDS','Tailor relevant skills and accomplishments to the job description without keyword stuffing.')",id);
        return id;
    }

    public List<AtsService.ReportSummary> list(String email,long resumeId){return jdbc.query("SELECT a.id,a.resume_id,a.job_description_id,a.overall_score,a.created_at FROM ats_reports a JOIN resumes r ON r.id=a.resume_id JOIN users u ON u.id=r.user_id WHERE u.email=? AND r.id=? ORDER BY a.created_at DESC",this::summary,email,resumeId);}
    public AtsService.Report get(String email,long id){AtsService.ReportSummary base=jdbc.query("SELECT a.id,a.resume_id,a.job_description_id,a.overall_score,a.created_at FROM ats_reports a JOIN resumes r ON r.id=a.resume_id JOIN users u ON u.id=r.user_id WHERE u.email=? AND a.id=?",this::summary,email,id).stream().findFirst().orElseThrow(()->new ResourceNotFoundException("ATS report not found."));List<AtsService.Keyword>keys=jdbc.query("SELECT keyword,found_in_resume FROM ats_keyword_matches WHERE ats_report_id=? ORDER BY importance_weight DESC,keyword",(r,n)->new AtsService.Keyword(r.getString(1),r.getBoolean(2)),id);List<String>missing=jdbc.query("SELECT skill_name FROM ats_missing_skills WHERE ats_report_id=? ORDER BY skill_name",(r,n)->r.getString(1),id);List<AtsService.Recommendation>recommendations=jdbc.query("SELECT category,recommendation_text FROM ats_recommendations WHERE ats_report_id=? ORDER BY id",(r,n)->new AtsService.Recommendation(r.getString(1),r.getString(2)),id);return new AtsService.Report(base,keys,missing,recommendations);}
    private AtsService.ReportSummary summary(ResultSet r,int n)throws SQLException{Timestamp t=r.getTimestamp("created_at");return new AtsService.ReportSummary(r.getLong("id"),r.getLong("resume_id"),r.getLong("job_description_id"),r.getBigDecimal("overall_score"),t==null? Instant.EPOCH:t.toInstant());}
    public record AnalysisInput(long resumeId,long jobId,String resumeContent,String jobContent){}
}
