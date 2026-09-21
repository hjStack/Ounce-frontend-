package ounce.market.demo.notification.entity;

import jakarta.persistence.*;
import ounce.market.demo.member.entity.Member;

@Entity
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long notificationId;

    private String title;

    @ManyToOne
    private Member member;
}
