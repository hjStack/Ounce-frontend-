package ounce.market.demo.timeDeal.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DealStatus {

    READY("진행 전"),         // 아직 밤 10시가 안 된 대기 상태 (화면에 '오픈 예정' 표시)
    IN_PROGRESS("진행 중"),   // 밤 10시 땡! 고객들이 폭풍 클릭하며 결제하는 상태
    SOLD_OUT("조기 마감"),    // 🚨 핵심! 시간은 남았는데 할당된 재고가 0이 되어 강제 종료된 상태
    CLOSED("종료됨");         // 밤 12시가 지나서 타임딜 시간이 정상적으로 끝난 상태

    private final String description;
}