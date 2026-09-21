package ounce.market.demo.review.entity;

import jakarta.persistence.*;
import ounce.market.demo.member.entity.Member;
import ounce.market.demo.product.entity.Product;

@Entity
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long reviewId;

    @ManyToOne(fetch = FetchType.LAZY)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    private Member member;

    private int rating;
    private String content;
}
