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
                bat 'docker-compose version'
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
                bat 'docker-compose build'
                echo 'Docker images built successfully.'
            }
        }

        stage('Docker Push') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    script {
                        def shortCommit = env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'
                        echo "Logging into Docker Hub as ${env.DOCKER_USER}..."
                        bat 'echo %DOCKER_PASS%| docker login -u %DOCKER_USER% --password-stdin'

                        echo "Tagging images with commit ${shortCommit} and latest..."
                        bat "docker tag to-doapp-backend:latest %DOCKER_USER%/todo-backend:${shortCommit}"
                        bat "docker tag to-doapp-backend:latest %DOCKER_USER%/todo-backend:latest"
                        bat "docker tag to-doapp-frontend:latest %DOCKER_USER%/todo-frontend:${shortCommit}"
                        bat "docker tag to-doapp-frontend:latest %DOCKER_USER%/todo-frontend:latest"

                        echo "Pushing backend images to Docker Hub..."
                        bat "docker push %DOCKER_USER%/todo-backend:${shortCommit}"
                        bat "docker push %DOCKER_USER%/todo-backend:latest"

                        echo "Pushing frontend images to Docker Hub..."
                        bat "docker push %DOCKER_USER%/todo-frontend:${shortCommit}"
                        bat "docker push %DOCKER_USER%/todo-frontend:latest"

                        echo "Logging out from Docker Hub..."
                        bat 'docker logout'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    string(credentialsId: 'supabase-url', variable: 'SUPABASE_URL'),
                    string(credentialsId: 'supabase-key', variable: 'SUPABASE_KEY'),
                    string(credentialsId: 'supabase-publishable-key', variable: 'SUPABASE_PUBLISHABLE_KEY')
                ]) {
                    echo 'Deploying application using published Docker Hub images...'
                    bat 'docker-compose -f docker-compose.prod.yml pull'
                    bat 'docker-compose -f docker-compose.prod.yml up -d'

                    echo 'Verifying post-deployment application health...'
                    powershell '''
                        $retry = 0
                        $maxRetries = 10
                        $deployed = $false
                        while ($retry -lt $maxRetries) {
                            Start-Sleep -Seconds 3
                            try {
                                $res = Invoke-RestMethod -Uri "http://localhost:3000/api/status" -TimeoutSec 5
                                if ($res.status -eq 'online' -and $res.supabase_connected -eq $true) {
                                    Write-Output "Deployment Healthy: Frontend and Backend online with Supabase connected!"
                                    $deployed = $true
                                    break
                                }
                            } catch {
                                Write-Output "Waiting for services to become healthy... (Attempt $($retry + 1)/$maxRetries)"
                            }
                            $retry++
                        }
                        if (-not $deployed) {
                            Write-Error "Deployment verification failed: Service did not report healthy status within timeout."
                            exit 1
                        }
                    '''
                    echo 'Application deployed and verified successfully.'
                }
            }
        }
    }

    post {
        success {
            echo 'CI/CD PASSED: Validation, tests, Docker build, Docker Hub push, and Deployment completed.'
        }

        failure {
            echo 'CI/CD FAILED: Check Console Output for the failing stage.'
        }
    }
}
