package com.airesumebuilder.feature.ai.service.impl;

import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiGenerationResponse;
import com.airesumebuilder.feature.ai.dto.response.AiJobResponse;
import com.airesumebuilder.feature.ai.service.AiJobService;
import com.airesumebuilder.feature.ai.service.AiService;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AiJobServiceImpl implements AiJobService {
  private final JdbcTemplate jdbc; private final UserRepository users; private final com.airesumebuilder.feature.ai.service.AiJobRunner runner;
  public AiJobServiceImpl(JdbcTemplate jdbc, UserRepository users, com.airesumebuilder.feature.ai.service.AiJobRunner runner) { this.jdbc = jdbc; this.users = users; this.runner = runner; }
  public AiJobResponse submit(String email, AiGenerationRequest request) { Long userId = users.findByEmail(email).orElseThrow().getId(); String id = UUID.randomUUID().toString(); jdbc.update("INSERT INTO ai_jobs (id,user_id,workflow,status,created_at) VALUES (?,?,?,?,?)", id,userId,request.workflow(),"PENDING",Instant.now()); runner.run(id,email,request); return new AiJobResponse(id,"PENDING",null,null); }
  public AiJobResponse get(String email, String id) { Long userId=users.findByEmail(email).orElseThrow().getId(); return jdbc.queryForObject("SELECT id,status,result,error_message FROM ai_jobs WHERE id=? AND user_id=?",(rs,row)->new AiJobResponse(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),id,userId); }
}
