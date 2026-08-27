package ounce.market.demo.cart.entity;

import jakarta.persistence.*;
import ounce.market.demo.product.entity.Product;

@Entity
public class CartProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long cartProductId;

    @ManyToOne(fetch = FetchType.LAZY)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    private Product product;

    @Column(nullable = false)
    private int quantity; // 🔥 수량은 여기에 있어야 합니다! (부대찌개 2개, 샐러드 3개)
}
