package com.airesumebuilder.feature.ats.service;

import com.airesumebuilder.feature.ats.repository.AtsRepository;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AtsService {
    private final AtsRepository repository; private final AtsScoringEngine scoring;
    public AtsService(AtsRepository repository,AtsScoringEngine scoring){this.repository=repository;this.scoring=scoring;}
    @Transactional public Report analyze(String email,AnalyzeRequest request){var input=repository.input(email,request.resumeId(),request.jobDescriptionId());var result=scoring.score(input.resumeContent(),input.jobContent());long id=repository.save(input,result.overallScore(),result.keywords());return repository.get(email,id);}
    @Transactional(readOnly=true)public Report get(String email,long id){return repository.get(email,id);}
    @Transactional(readOnly=true)public List<ReportSummary> list(String email,long resumeId){return repository.list(email,resumeId);}
    public record AnalyzeRequest(@Positive long resumeId,@Positive long jobDescriptionId){}
    public record ReportSummary(long id,long resumeId,long jobDescriptionId,BigDecimal overallScore,Instant createdAt){}
    public record Keyword(String keyword,boolean found){} public record Recommendation(String category,String text){}
    public record Report(ReportSummary summary,List<Keyword>keywords,List<String>missingSkills,List<Recommendation>recommendations){}
}
