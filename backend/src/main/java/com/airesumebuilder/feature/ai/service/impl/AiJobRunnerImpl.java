package com.airesumebuilder.feature.ai.service.impl;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.service.AiJobRunner;
import com.airesumebuilder.feature.ai.service.AiService;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
@Service public class AiJobRunnerImpl implements AiJobRunner { private final JdbcTemplate jdbc; private final AiService ai; public AiJobRunnerImpl(JdbcTemplate jdbc,AiService ai){this.jdbc=jdbc;this.ai=ai;} @Async("aiTaskExecutor") public void run(String id,String email,AiGenerationRequest request){try{jdbc.update("UPDATE ai_jobs SET status='PROCESSING' WHERE id=?",id);var result=ai.generate(email,request);jdbc.update("UPDATE ai_jobs SET status='SUCCEEDED',result=?,completed_at=? WHERE id=?",result.content(),Instant.now(),id);}catch(Exception e){jdbc.update("UPDATE ai_jobs SET status='FAILED',error_message=?,completed_at=? WHERE id=?","Generation failed.",Instant.now(),id);}} }
