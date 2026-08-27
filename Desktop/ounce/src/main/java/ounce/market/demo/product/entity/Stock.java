package ounce.market.demo.product.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import ounce.market.demo.common.BaseEntity;

@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Stock extends BaseEntity {

    @Id
    @GeneratedValue
    private Long stockId;

    private int quantity;

    @Version // 🔥 10시 트래픽을 방어할 낙관적 락의 핵심!
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private  Product product;
}
