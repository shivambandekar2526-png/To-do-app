pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        SUPABASE_BUCKET = 'To-Do data'
        PORT = '5000'
        PYTHONUNBUFFERED = '1'
        DOCKER_HOST = 'npipe:////./pipe/docker_engine'
        PATH = "C:\\Users\\arya\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;${env.PATH}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Source code checked out successfully.'
            }
        }

        stage('Check Tools') {
            steps {
                bat 'python --version'
                bat 'node --version'
                bat 'npm --version'
                bat 'docker --version'
                bat 'docker compose version'
            }
        }

        stage('Install Python Dependencies') {
            steps {
                bat 'python -m pip install -r backend/requirements.txt'
            }
        }

        stage('Install Node Dependencies') {
            steps {
                bat 'npm install --prefix frontend'
            }
        }

        stage('Validate Python') {
            steps {
                bat 'python -m compileall -q backend'
                bat 'python -m py_compile test_app.py run.py'
                echo 'Python validation passed.'
            }
        }

        stage('Validate JavaScript') {
            steps {
                bat 'node --check frontend/server.js'
                echo 'JavaScript validation passed.'
            }
        }

        stage('Integration Test') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'supabase-url',
                        variable: 'SUPABASE_URL'
                    ),
                    string(
                        credentialsId: 'supabase-key',
                        variable: 'SUPABASE_KEY'
                    ),
                    string(
                        credentialsId: 'supabase-publishable-key',
                        variable: 'SUPABASE_PUBLISHABLE_KEY'
                    )
                ]) {
                    bat 'python test_app.py'
                }
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker images after successful tests...'
                bat 'docker compose build'
                echo 'Docker images built successfully.'
            }
        }
    }

    post {
        success {
            echo 'CI PASSED: Validation, tests, and Docker build completed.'
        }

        failure {
            echo 'CI FAILED: Check Console Output for the failing stage.'
        }
    }
}
