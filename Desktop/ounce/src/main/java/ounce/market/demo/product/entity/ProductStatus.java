package ounce.market.demo.product.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProductStatus {

    PREPARING("판매 준비중"),    // 1. 관리자가 상품명과 사진을 올리고 있는 단계 (고객 화면엔 안 보임)
    ON_SALE("정상 판매중"),      // 2. 고객들이 자유롭게 장바구니에 담고 살 수 있는 기본 상태
    TIME_DEAL("타임딜 진행중"),  // 3. 10시 정각! 할인율이 폭발하는 이벤트 상태 (화면에 빨간 뱃지 표시용)
    SOLD_OUT("품절"),            // 4. 재고가 0이 되어 구매 버튼이 비활성화된 상태
    STOPPED("판매 중지");        // 5. 상품에 치명적인 하자(예: 유통기한 오류)가 발견되어 관리자가 강제로 내린 상태

    private final String description;
}