#!/bin/bash
# Start Jupyter Notebook for EEG Project
# Run this script from the project root directory

VENV_BIN="./.venv/bin"

# Activate virtual environment
source ./.venv/bin/activate

echo "======================================"
echo "  EEG Project - Jupyter Notebook"
echo "======================================"
echo ""
echo "Environment: .venv (Python 3.11)"
echo "Kernel: EEG Project (Python 3.11)"
echo ""
echo "Opening notebooks..."
echo ""

# Start Jupyter
exec $VENV_BIN/jupyter notebook notebooks/
