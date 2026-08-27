package ounce.market.demo.qna.entity;

import jakarta.persistence.*;
import ounce.market.demo.common.BaseEntity;
import ounce.market.demo.member.entity.Member;

@Entity
public class QnA extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long qnaId;

    @ManyToOne
    private Member member;

    private String title;
    private String content;

    @Enumerated(EnumType.STRING)
    private QnaStatus status;
}
