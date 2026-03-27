# LHS Inventory & Field Service Management

**Live URL:** https://LifetimeServices.github.io/lhs-inventory

## Credentials
| Email | Password | Role |
|---|---|---|
| george@lifetimehomeservices.com | Radon2026! | Admin |
| scott@lifetimehomeservices.com | Scott2026! | Admin |
| gb.mgr@lhs.com | gbmgr | Location Manager |

## Setup Steps
1. Run `schema.sql` in Supabase SQL Editor
2. Run `deploy.sh` to push to GitHub Pages
3. Enable GitHub Pages: repo Settings → Pages → main branch

## Database
- Supabase: https://vuwcnqvrgmdknvbajhtt.supabase.co
- Tables: users, divisions, vendors, locations, items, location_stock,
  van_inventory, purchase_orders, po_lines, transfers, testers,
  customers, work_orders, wo_materials, schedule, audit_log
