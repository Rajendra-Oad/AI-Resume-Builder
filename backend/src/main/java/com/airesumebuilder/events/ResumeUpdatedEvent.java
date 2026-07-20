package com.airesumebuilder.events;
import java.util.Map;
public record ResumeUpdatedEvent(Long resumeId,Long userId,Map<String,?>before,Map<String,?>after){}
