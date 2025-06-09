# src/debate_visualizer.py

import streamlit as st
import requests

API_URL = "http://localhost:5000/api"

st.title("Product Team Debate Visualizer")

# Start debate
topic = st.text_input("Enter a topic for debate:")
if st.button("Start Debate"):
    response = requests.post(f"{API_URL}/start_debate", json={"topic": topic})
    st.session_state.debate_history = [response.json()]

# Continue debate
if st.button("Continue Debate"):
    response = requests.post(f"{API_URL}/continue_debate")
    st.session_state.debate_history.append(response.json())

# Revisit topic
if st.button("Revisit Topic"):
    response = requests.post(f"{API_URL}/revisit_topic")
    st.session_state.debate_history = [response.json()]

# Display debate history
st.header("Debate History")
for round_data in st.session_state.get("debate_history", []):
    st.subheader(f"Round {round_data['round']}")
    for argument in round_data["results"]:
        st.markdown(f"**{argument['agent']}** — Position: {argument['position']}")
        for step in argument["reasoning"]:
            st.markdown(f"- {step}")
