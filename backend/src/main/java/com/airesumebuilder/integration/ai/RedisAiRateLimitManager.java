package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.ai.redis.enabled", havingValue = "true")
public class RedisAiRateLimitManager {
  private final StringRedisTemplate redis; private final int limit;
  public RedisAiRateLimitManager(StringRedisTemplate redis,@Value("${app.ai.rate-limit.per-user-per-hour:20}") int limit){this.redis=redis;this.limit=limit;}
  public void check(Long userId){String key="ai:rate:"+userId+":"+(System.currentTimeMillis()/3600000);Long count=redis.opsForValue().increment(key);if(count!=null&&count==1)redis.expire(key,Duration.ofHours(1));if(count!=null&&count>limit)throw new ExternalServiceException("AI generation limit reached. Try again later.");}
}
