package ounce.market.demo.product.entity;

import jakarta.persistence.*;
import ounce.market.demo.cart.entity.Cart;
import ounce.market.demo.common.BaseEntity;

@Entity
public class Product extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long productId;

    private String productCode;
    private String name;

    private int basePrice;
    // 할인된 가격은 비지니스 로직으로

    @Enumerated(EnumType.STRING)
    private ProductStatus status;

    private String description;
    private String imageUrl;
}
