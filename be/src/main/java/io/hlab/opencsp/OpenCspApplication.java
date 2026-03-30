package io.hlab.opencsp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OpenCspApplication {

	public static void main(String[] args) {
		SpringApplication.run(OpenCspApplication.class, args);
	}

}
