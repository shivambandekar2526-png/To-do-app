pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'To-do app source code is available'
            }
        }

        stage('Build') {
            steps {
                echo 'Building the To-do app'
            }
        }

        stage('Test') {
            steps {
                echo 'Pipeline test completed'
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Jenkins pipeline completed!'
        }

        failure {
            echo 'FAILED: Check the console output.'
        }
    }
}
