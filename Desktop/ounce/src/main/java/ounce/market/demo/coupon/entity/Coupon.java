package ounce.market.demo.coupon.entity;

import jakarta.persistence.*;
import ounce.market.demo.member.entity.Member;
import ounce.market.demo.order.entity.Order;

@Entity
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long couponId;

    @ManyToOne(fetch = FetchType.LAZY)
    private Member member;

    @Enumerated(EnumType.STRING)
    private CouponStatus status;


    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = true) // 쿠폰을 쓸수도 있고 안쓸수도
    private Order order;  // 1개의 주문당 1개의 쿠폰만 사용가능함
}
