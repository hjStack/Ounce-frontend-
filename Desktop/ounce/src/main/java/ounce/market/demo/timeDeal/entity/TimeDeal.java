package ounce.market.demo.timeDeal.entity;

import jakarta.persistence.*;
import ounce.market.demo.common.BaseEntity;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ounce.market.demo.product.entity.Product;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimeDeal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long timeDealId;

    // 🔥 하나의 상품이 여러 타임딜 스케줄을 가지므로 N:1 (TimeDeal 입장에선 ManyToOne)
    // 외래 키(product_id)를 TimeDeal이 쥐고 있습니다!
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private int discountRate; // 할인율 (예: 80 -> 80% 할인)

    @Column(nullable = false)
    private LocalDateTime startTime; // 타임딜 시작 시간 (밤 10시)

    @Column(nullable = false)
    private LocalDateTime endTime; // 타임딜 종료 시간 (밤 12시)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DealStatus status; // 타임딜 상태 (READY, IN_PROGRESS, SOLD_OUT, CLOSED)

    @Column(nullable = false)
    private int maxPurchaseLimit; // 타임딜용 한정 수량 (예: 선착순 100개!)
}