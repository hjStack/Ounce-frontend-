package ounce.market.demo.delivery.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DeliveryStatus {

    PREPARING("배송 준비중"),     // 주문/결제가 완료되어 물류창고에서 상품을 포장하는 단계
    SHIPPED("배송 중"),          // 택배 차량이나 새벽배송 트럭에 실려 출발한 단계
    DELIVERED("배송 완료"),        // 고객의 집 앞이나 경비실에 안전하게 도착한 단계
    CANCELED("배송 취소");        // 배송 전 주문 취소로 인해 배송이 취소된 상태

    private final String description;
}