package ounce.market.demo.order.entity;

import jakarta.persistence.*;
import ounce.market.demo.delivery.entity.Delivery;
import ounce.market.demo.common.BaseEntity;
import ounce.market.demo.member.entity.Member;

@Entity
@Table(name = "orders")
public class Order extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long orderId;

    private int totalAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MEMBER_ID")
    private Member member;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    // 🔥mappedBy를 통해 "내 진짜 주인은 Delivery 테이블의 order 필드야"라고 선언합니다.
    // 🔥 cascade를 걸어두면 주문 저장 시 배송도 자동으로 한 방에 세이브됩니다!
    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Delivery delivery;
}
