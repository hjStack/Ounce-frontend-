package ounce.market.demo.point.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PointType {

    // ➕ 포인트 증가 사유 (Plus)
    CHARGE("포인트 충전"),       // 고객이 신용카드로 돈을 주고 포인트를 충전함
    REWARD("이벤트 적립"),       // 리뷰 작성, 회원가입 축하 등으로 서버가 꽁짜로 줌
    REFUND("결제 취소 환불"),    // 상품 품절이나 변심으로 인해 주문이 취소되어 포인트가 돌아옴

    // ➖ 포인트 감소 사유 (Minus)
    USE("상품 결제 사용"),       // 타임딜 상품 결제 시 차감됨
    EXPIRED("유효기간 만료 소멸"); // 꽁짜로 준 포인트의 유효기간이 끝나서 서버가 회수함

    private final String description;
}