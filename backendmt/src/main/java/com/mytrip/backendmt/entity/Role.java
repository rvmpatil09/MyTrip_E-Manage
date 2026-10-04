package com.mytrip.backendmt.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;// Inside User.java
import lombok.Data;


public enum Role {
    ROLE_USER,
    ROLE_ADMIN
}
