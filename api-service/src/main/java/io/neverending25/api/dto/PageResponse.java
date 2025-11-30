package io.neverending25.api.dto;

import lombok.Data;

import java.util.List;

@Data
public class PageResponse<T> {
    private List<T> content;
    private Integer pageNumber;
    private Integer pageSize;
    private Integer totalPages;
    private Long totalElements;
    private Boolean first;
    private Boolean last;
}