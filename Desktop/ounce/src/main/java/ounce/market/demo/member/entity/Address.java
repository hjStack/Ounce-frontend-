package ounce.market.demo.member.entity;

import jakarta.persistence.*;

@Entity
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long addressId;

    @ManyToOne(fetch = FetchType.LAZY)
    private Member member;
}
