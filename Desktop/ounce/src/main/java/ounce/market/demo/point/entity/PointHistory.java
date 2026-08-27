package ounce.market.demo.point.entity;

import jakarta.persistence.*;
import ounce.market.demo.common.BaseEntity;
import ounce.market.demo.member.entity.Member;

@Entity
public class PointHistory extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long pointHistoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    private Member member;

    private int amount;
    @Enumerated(EnumType.STRING)
    private PointType type;
}
