package ounce.market.demo.order.entity;

import jakarta.persistence.*;
import ounce.market.demo.product.entity.Product;

@Entity
public class OrderItem {

    @Id
    @GeneratedValue
    private Long orderItemId;

    private int price;

    @ManyToOne(fetch = FetchType.LAZY)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    private Product product;

    @Column(nullable = false)
    private int quantity;
}
