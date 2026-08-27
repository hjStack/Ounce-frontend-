package ounce.market.demo.delivery.entity;


import jakarta.persistence.*;
import ounce.market.demo.order.entity.Order;

@Entity
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long deliveryId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false) // NOT NULL 보장!
    private Order order;

    @Enumerated(EnumType.STRING)
    private DeliveryStatus status;

    @Enumerated(EnumType.STRING)
    private DeliveryType deliveryType;
}
