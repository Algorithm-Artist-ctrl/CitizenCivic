#!/usr/bin/env bash
# CitizenCivic — Production Build Script (Node.js + Express + React)
set -o errexit

echo "==> [CitizenCivic] Building Node.js Backend..."
npm --prefix server install
npm --prefix server run build

echo "==> [CitizenCivic] Building React Frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> [CitizenCivic] Build completed successfully."
