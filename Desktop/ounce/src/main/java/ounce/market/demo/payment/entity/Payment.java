package ounce.market.demo.payment.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ounce.market.demo.common.BaseEntity;
import ounce.market.demo.order.entity.Order;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long paymentId;

    @OneToOne(fetch = FetchType.LAZY)
    private Order order;

    @Column(nullable = false)
    private int amount; // 실제 결제된 금액 (할인 다 영끌해서 나온 최종 금액)

    private String paymentMethod;

    @Column(length = 100)
    private String pgTid; // PG사(토스 등)가 발급해주는 고유 거래번호 (환불할 때 무조건 필요함!)

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;
}
