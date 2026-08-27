package ounce.market.demo.delivery.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DeliveryType {

    DAWN("새벽 배송"),       // 밤 10시 마감 후 다음날 아침 7시 전 도착
    NORMAL("일반 배송");     // 일반 택배사를 통한 1~2일 소요 배송

    private final String description;
}