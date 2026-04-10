package main

import (
	"context"
	"log"

	"github.com/tdvorak/primora/apps/backend/internal/app"
)

func main() {
	application, err := app.Bootstrap(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	defer application.Close()

	if err := application.Run(); err != nil {
		log.Fatal(err)
	}
}
