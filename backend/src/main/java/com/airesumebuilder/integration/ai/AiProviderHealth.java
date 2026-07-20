package com.airesumebuilder.integration.ai;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
@Component public class AiProviderHealth { private final ConcurrentHashMap<String, State> states=new ConcurrentHashMap<>(); public boolean available(String key){State s=states.get(key);return s==null||s.openUntil().isBefore(Instant.now());} public void success(String key){states.remove(key);} public void failure(String key){State s=states.getOrDefault(key,new State(0,Instant.EPOCH));int n=s.failures()+1;states.put(key,new State(n,n>=3?Instant.now().plusSeconds(60):Instant.EPOCH));} public String status(String key){State s=states.get(key);return s!=null&&s.openUntil().isAfter(Instant.now())?"OPEN":"HEALTHY";} private record State(int failures,Instant openUntil){} }
