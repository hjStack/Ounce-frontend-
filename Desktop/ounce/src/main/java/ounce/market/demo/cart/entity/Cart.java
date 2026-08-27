package ounce.market.demo.cart.entity;

import jakarta.persistence.*;
import ounce.market.demo.member.entity.Member;
import ounce.market.demo.product.entity.Product;

@Entity
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long cartId;

    @OneToOne(fetch = FetchType.LAZY) // 🔥 잊지않고 LAZY 추가!
    @JoinColumn(name = "member_id")
    private Member member;

}
