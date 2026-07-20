package com.airesumebuilder.feature.template.service;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import java.sql.ResultSet;import java.sql.SQLException;import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Repository;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;

@Service public class TemplateService { private final TemplateRepository repository;public TemplateService(TemplateRepository r){repository=r;}
 @Transactional(readOnly=true) public List<TemplateResponse> list(){return repository.list();}
 @Transactional(readOnly=true) public TemplateResponse get(long id){return repository.get(id);}
 @Transactional public void apply(String email,long templateId,long resumeId){repository.apply(email,templateId,resumeId);}
 public record TemplateResponse(Long id,String name,String description,String previewUrl,String configuration){}
}
@Repository class TemplateRepository {private final JdbcTemplate jdbc;TemplateRepository(JdbcTemplate j){jdbc=j;}
 List<TemplateService.TemplateResponse> list(){return jdbc.query("SELECT id,name,description,preview_url,configuration FROM templates WHERE is_active=TRUE ORDER BY name",this::map);}
 TemplateService.TemplateResponse get(long id){return jdbc.query("SELECT id,name,description,preview_url,configuration FROM templates WHERE id=? AND is_active=TRUE",this::map,id).stream().findFirst().orElseThrow(()->new ResourceNotFoundException("Template not found."));}
 void apply(String email,long templateId,long resumeId){get(templateId);int n=jdbc.update("UPDATE resumes r JOIN users u ON u.id=r.user_id SET r.template_id=?,r.updated_at=NOW(6) WHERE r.id=? AND u.email=? AND r.deleted_at IS NULL",templateId,resumeId,email);if(n==0)throw new ResourceNotFoundException("Resume not found.");}
 private TemplateService.TemplateResponse map(ResultSet r,int n)throws SQLException{return new TemplateService.TemplateResponse(r.getLong("id"),r.getString("name"),r.getString("description"),r.getString("preview_url"),r.getString("configuration"));}}
