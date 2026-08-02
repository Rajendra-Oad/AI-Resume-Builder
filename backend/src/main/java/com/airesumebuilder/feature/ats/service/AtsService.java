package com.airesumebuilder.feature.ats.service;

import com.airesumebuilder.feature.ats.repository.AtsRepository;
import com.airesumebuilder.feature.analytics.service.UsageMetricService;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AtsService {
    private final AtsRepository repository; private final AtsScoringEngine scoring; private final UsageMetricService metrics;
    public AtsService(AtsRepository repository,AtsScoringEngine scoring,UsageMetricService metrics){this.repository=repository;this.scoring=scoring;this.metrics=metrics;}
    @Transactional public Report analyze(String email,AnalyzeRequest request){var input=repository.input(email,request.resumeId(),request.jobDescriptionId());var result=scoring.score(input.resumeContent(),input.jobContent());long id=repository.save(input,result.overallScore(),result.keywords());metrics.increment(UsageMetricService.ATS_REPORT);return repository.get(email,id);}
    @Transactional(readOnly=true)public Report get(String email,long id){return repository.get(email,id);}
    @Transactional(readOnly=true)public Page list(String email,long resumeId,int page,int size){int p=Math.max(0,page),s=Math.min(Math.max(1,size),100);return new Page(repository.list(email,resumeId,s,p*s),p,s,repository.count(email,resumeId));}
    public record AnalyzeRequest(@Positive long resumeId,@Positive long jobDescriptionId){}
    public record ReportSummary(long id,long resumeId,long jobDescriptionId,BigDecimal overallScore,Instant createdAt){}
    public record Page(List<ReportSummary> items,int page,int size,long total){}
    public record Keyword(String keyword,boolean found){} public record Recommendation(String category,String text){}
    public record Report(ReportSummary summary,List<Keyword>keywords,List<String>missingSkills,List<Recommendation>recommendations){}
}
