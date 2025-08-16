#!/bin/bash

echo "Setting up Prisma database..."

# Check if MySQL is running
if ! mysqladmin ping -h"localhost" --silent; then
    echo "Error: MySQL server is not running at localhost:3306"
    echo "Please start MySQL service first:"
    echo "  sudo service mysql start"
    echo "  # or"
    echo "  sudo systemctl start mysql"
    exit 1
fi

echo "MySQL server is running. Proceeding with database setup..."

# Create database if it doesn't exist
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS schedule;"

echo "Running Prisma migrations..."
npx prisma migrate dev --name init

echo "Generating Prisma client..."
npx prisma generate

echo "Running database seed..."
npx prisma db seed

echo "Database setup complete!"
echo ""
echo "You can now:"
echo "1. Start the development server: npm run dev"
echo "2. View your database: npx prisma studio"
echo "3. Reset database: npx prisma migrate reset"