package com.airesumebuilder.feature.resume.dto.response;

public record ResumeSectionResponse(
    Long id,String type,Integer displayOrder,String institution,String degree,Integer startYear,Integer endYear,
    String employer,String role,String startDate,String endDate,String name,String description,String proficiencyLevel,String issuedBy
) {}
