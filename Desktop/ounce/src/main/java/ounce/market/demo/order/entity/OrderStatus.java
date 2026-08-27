package ounce.market.demo.order.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderStatus {

    PAYMENT_WAITING("결제 대기"),    // 1. 주문 생성 직후, 포인트 차감 전
    PAYMENT_COMPLETED("결제 완료"),  // 2. 포인트 차감 성공 (이때 재고도 확정 차감)
    PREPARING("상품 준비중"),        // 3. 물류창고에서 우삼겹 부대찌개 포장 중
    SHIPPED("배송 중"),              // 4. 새벽 배송 트럭 출발
    DELIVERED("배송 완료"),          // 5. 고객 문 앞 도착
    CANCELED("주문 취소");           // 6. 고객 변심 취소 또는 재고 부족으로 인한 자동 취소

    private final String description; // 한글 설명 (프론트엔드에 뿌려줄 때 유용함)
}