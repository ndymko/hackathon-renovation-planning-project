package io.neverending25.plan;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;

@SpringBootApplication
@EntityScan("io.neverending25.plan.model")
public class PlanServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(PlanServiceApplication.class, args);
	}

}
