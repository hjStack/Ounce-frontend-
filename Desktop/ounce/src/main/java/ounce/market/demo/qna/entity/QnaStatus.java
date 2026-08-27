package ounce.market.demo.qna.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum QnaStatus {
    WAITING("답변 대기"),
    ANSWERED("답변 완료");

    private final String description;
}
