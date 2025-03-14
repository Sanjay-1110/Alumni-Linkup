from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time

# Setup Chrome in Incognito mode
chrome_options = Options()
chrome_options.add_argument("--incognito")
chrome_options.add_argument("--start-maximized")

# Initialize WebDriver
driver = webdriver.Chrome(options=chrome_options)

try:
    # Step 1: Open localhost
    driver.get("http://localhost:5173")

    # Step 2: Click on "Get Started" button
    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.LINK_TEXT, "Get Started"))
    ).click()

    # Verify registration page load
    WebDriverWait(driver, 10).until(
        EC.url_contains("/register")
    )

    # Step 3: Open TempMailo in new tab
    driver.execute_script("window.open('https://tempmailo.com', '_blank');")
    driver.switch_to.window(driver.window_handles[1])

    # Step 4: Wait for email address to fully load
    print("Waiting for temporary email generation...")
    email_element = WebDriverWait(driver, 30).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".email-address"))
    )
    
    # Extra stabilization wait
    time.sleep(2)
    
    # Get email text with retries
    email = ""
    for _ in range(5):
        email = email_element.text.strip()
        if "@" in email:
            break
        time.sleep(1)
    
    if not email:
        raise Exception("Failed to retrieve valid email address")
    
    print(f"Obtained temporary email: {email}")

    # Step 5: Switch back to registration tab
    driver.switch_to.window(driver.window_handles[0])

    # Step 6: Fill registration form with robust waits
    fields = {
        "email": email,
        "first_name": "John",
        "last_name": "Doe",
        "password": "SecurePass123!",
        "confirm_password": "SecurePass123!"
    }

    for field, value in fields.items():
        element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, field)))
        element.clear()
        element.send_keys(value)
        time.sleep(0.5)  # Simulate human typing

    # Step 7: Submit registration
    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
    ).click()

    print("Account creation completed successfully.")
    print("Browser remains open for manual verification.")
    input("Press Enter to exit...")

except Exception as e:
    print(f"Error occurred: {str(e)}")
    input("Press Enter to exit...")

finally:
    # Browser remains open until manual closure
    pass