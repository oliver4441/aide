#!/bin/bash
# Download all HTML screens from Stitch

# Screen IDs and names from the project
declare -A screens=(
  ["2a8c4bc10f254d42a6ea03492000594a"]="manager-login-desktop"
  ["9299d7aee043436190821e8a2b473cb8"]="manager-login-mobile"
  ["e3840dbc496848eab6edd3136ee59c15"]="manager-login-mobile-2"
  ["442ea1f4f82a48b9957651f2677711f2"]="dashboard-desktop"
  ["5dd04d1ce6994dcc9d195a464c82b099"]="dashboard-mobile"
  ["3a37dc8c475e4c7d8ddee555b2c417f0"]="dashboard-dark"
  ["61ed29a327884ab18ce4c434bd7ddf4a"]="new-sale-desktop"
  ["ac3eb388827e4e02b2e8086892ae4196"]="new-sale-mobile"
  ["8053567563f1466d85eed43cab2af9a7"]="inventory-desktop"
  ["83038869071042a2a5678128ff8a5e44"]="inventory-mobile"
  ["948dc2c6309f4295b5ebe73e3d442318"]="reports-mobile"
  ["8f8d594af977452089442a756644ab08"]="settings-mobile"
  ["8213a0130ab9498e90ed8660f5d9d16f"]="receipt-preview"
  ["50f418beb0d34eba97f2fcffe2fefbde"]="landing-page"
  ["4fd56703c80440cc85ebee61e0bc997f"]="landing-page-2"
)

for id in "${!screens[@]}"; do
  name="${screens[$id]}"
  echo "Downloading: $name"
done
