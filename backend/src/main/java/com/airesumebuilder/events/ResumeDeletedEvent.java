package com.airesumebuilder.events;
import java.util.Map;
public record ResumeDeletedEvent(Long resumeId,Long userId,Map<String,?>before){}
