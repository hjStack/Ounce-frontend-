package ounce.market.demo.payment.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PaymentStatus {

    PENDING("결제 대기"),      // PG사(토스) 결제창 띄운 상태 (아직 돈 안 빠져나감)
    COMPLETED("결제 완료"),    // 돈(또는 포인트)이 성공적으로 차감됨! (이때 재고 락 확정)
    FAILED("결제 실패"),       // 잔액 부족, 한도 초과 등으로 승인 거절됨
    CANCELED("결제 취소"),     // 사용자가 결제창에서 뒤로가기 누름
    REFUNDED("환불 완료");     // 결제 완료 후, 고객 변심으로 돈을 돌려줌

    private final String description;
}