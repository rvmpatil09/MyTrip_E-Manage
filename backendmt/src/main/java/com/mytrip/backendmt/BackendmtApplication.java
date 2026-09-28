package com.mytrip.backendmt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync

public class BackendmtApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendmtApplication.class, args);
	}

}
