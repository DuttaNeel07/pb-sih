# sih Registration Portal

A web-based registration platform built for the **internal rounds of Smart India Hackathon (SIH)** — one of the **largest hackathons in Asia**.  
The platform handled **high traffic with lakhs of visits** during the registration period.

---

## 🧠 About the Project

This project was developed to streamline participant registrations for internal SIH selections.  
It focused on reliability, performance, and ease of use under heavy traffic conditions.

The portal enabled students to:
- Register for internal hackathon rounds
- Submit required details efficiently
- Access event-related information seamlessly

---

## 🚀 Key Highlights

- 🏆 Built for **Smart India Hackathon internal rounds**
- 📈 Handled **lakhs of visits** during peak registration time
- ⚡ Optimized for performance and responsiveness
- 🧑‍🤝‍🧑 Designed for large-scale student participation

---

## 🛠 Tech Stack

- **React** — component-based UI
- **JavaScript**
- **CSS / modern styling**
- **REST APIs** — backend integration
- **Git & GitHub** — version control

---

## 🧑‍💻 Responsibilities & Learnings

- Built and maintained frontend components for large-scale usage
- Ensured responsive design across devices
- Worked on performance optimizations for high-traffic scenarios
- Learned to design UIs for real-world scale and deadlines

---

## ⚠️ Note

This repository contains the **frontend code** used during internal SIH rounds.  
Certain backend integrations or credentials are intentionally excluded.

---

## 📌 Impact

Building this platform provided hands-on experience with:
- Real-world traffic at scale
- Time-critical feature delivery
- Production-focused frontend development

---

## 📝 License

Add license information here if applicable.

## Registration and signup windows

Set `NEXT_PUBLIC_REGISTRATION_START_AT` in the deployment environment using an
ISO-8601 timestamp with its timezone offset, for example:

```env
NEXT_PUBLIC_REGISTRATION_START_AT=2026-08-24T21:00:00+05:30
NEXT_PUBLIC_REGISTRATION_END_AT=2026-09-04T11:59:00+05:30
REGISTRATION_END_AT=2026-09-04T11:59:00+05:30
NEXT_PUBLIC_SIGNUP_END_AT=2026-09-04T11:59:00+05:30
SIGNUP_END_AT=2026-09-04T11:59:00+05:30
```

Set each server-side value and its `NEXT_PUBLIC_` counterpart to the same time.
The signup deadline defaults to **4 September 2026 at 11:59 AM IST**.
