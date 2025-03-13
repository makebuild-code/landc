/**
 * FormChippy.js v1.1.0 (Standalone)
 * A smooth, vertical scrolling multi-step form experience
 * 
 * @license MIT
 * @author JP
 */
(function() {
    'use strict';
  
  /**
   * Navigation.js
   * Handles navigation between form slides
   */
  
  class Navigation {
      constructor(formChippy) {
          this.formChippy = formChippy
          this.options = formChippy.options
          this.observer = null
      }
  
      /**
       * Set up buttons and keyboard navigation
       */
      setupNavigation() {
          this._setupButtons()
          this._setupKeyboardNavigation()
  
          // Only set up the intersection observer if explicitly enabled in options
          if (this.formChippy.options.useIntersectionObserver === true) {
              this._setupIntersectionObserver()
          }
          
          // Initialize the slide counter on load with current slide index
          this.updateSlideCounter(this.formChippy.currentSlideIndex)
      }
  
      /**
       * Set up buttons for navigation
       * @private
       */
      _setupButtons() {
          // ===== RESET BUTTONS =====
          // Find all reset buttons
          const resetButtons = this.formChippy.container.querySelectorAll(
              '[data-fc-button="reset"], [data-fc-button-reset]'
          );
          
          if (resetButtons.length > 0) {
              this.formChippy.debug.info(`Found ${resetButtons.length} reset buttons`);
              
              resetButtons.forEach((button) => {
                  // Remove existing click listeners by replacing the button
                  const newButton = button.cloneNode(true);
                  button.parentNode.replaceChild(newButton, button);
                  
                  // Add the reset event listener
                  newButton.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      this.formChippy.debug.info('Reset button clicked');
                      
                      // Get the target slide index (usually 0)
                      let targetIndex = 0;
                      const goToAttr = newButton.getAttribute('data-fc-go-to');
                      
                      if (goToAttr) {
                          // Find slide by id if specified
                          const targetSlide = this.formChippy.slides.findIndex(
                              slide => slide.getAttribute('data-fc-slide') === goToAttr
                          );
                          if (targetSlide !== -1) {
                              targetIndex = targetSlide;
                          }
                      }
                      
                      // Reset the form and navigate to the target slide
                      this.formChippy.reset();
                      this.formChippy.goToSlide(targetIndex);
                  });
              });
          }
          
          // ===== NEXT BUTTONS =====
          // Find all next buttons - exclude both submit and prev buttons
          const nextButtons = this.formChippy.container.querySelectorAll(
              '[data-fc-button="next"], [data-fc-button-next]'
          );
  
          // Store reference to next buttons for consistency
          this.nextButtons = Array.from(nextButtons);
          
          // Clear any existing listeners using the same approach as prev buttons
          this.nextButtons.forEach((button) => {
              // Remove existing click listeners by replacing the button
              const newButton = button.cloneNode(true);
              button.parentNode.replaceChild(newButton, button);
              
              // Add the simplified event listener
              newButton.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Get the CURRENT slide index and slide
                  const currentIndex = this.formChippy.currentSlideIndex;
                  const currentSlide = this.formChippy.slides[currentIndex];
                  
                  // Log the navigation attempt
                  this.formChippy.debug.info(
                      `Next button clicked at index ${currentIndex}`,
                      { direction: 'next' }
                  );
                  
                  // Check validation only if it's enabled
                  let isValid = true;
                  if (this.formChippy.validationEnabled) {
                      isValid = this.formChippy.validation.validateSlide(currentSlide);
                      this.formChippy.debug.info(`Validation result: ${isValid ? 'PASS' : 'FAIL'}`);
                  }
                  
                  if (isValid) {
                      // Calculate the next index (guard against exceeding slides)
                      const nextIndex = Math.min(currentIndex + 1, this.formChippy.totalSlides - 1);
                      
                      // Direct navigation to next slide with consistent logging
                      this.formChippy.debug.info(`NEXT BUTTON: Navigating from ${currentIndex} to ${nextIndex}`);
                      this.formChippy.goToSlide(nextIndex);
                  } else {
                      // Highlight invalid inputs if validation failed
                      this._highlightInvalidInputs(currentSlide);
                  }
              })
  
              // Store the button reference for updating its state later
              if (!this.nextButtons) {
                  this.nextButtons = []
              }
              if (!this.nextButtons.includes(button)) {
                  this.nextButtons.push(button)
              }
          })
  
          // ===== PREVIOUS BUTTONS =====
          // Find all previous buttons with either attribute format
          const prevButtons = this.formChippy.container.querySelectorAll(
              '[data-fc-button-prev], [data-fc-button="prev"]'
          );
          
          // Store references to prev buttons for future use
          this.prevButtons = Array.from(prevButtons);
          
          // Clear any existing event listeners (use simpler method than cloning)
          this.prevButtons.forEach((button) => {
              // Remove existing click listeners
              const newButton = button.cloneNode(true);
              button.parentNode.replaceChild(newButton, button);
              
              // Add the simplified event listener to the new button
              newButton.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Get the CURRENT slide index at click time
                  const currentIndex = this.formChippy.currentSlideIndex;
                  
                  this.formChippy.debug.info(`Previous button clicked at index ${currentIndex}`);
                  
                  // Only navigate if we're not on the first slide
                  if (currentIndex > 0) {
                      const prevIndex = currentIndex - 1;
                      
                      // Direct navigation to previous slide - consistent with next button approach
                      this.formChippy.debug.info(`PREV BUTTON: Navigating from ${currentIndex} to ${prevIndex}`);
                      this.formChippy.goToSlide(prevIndex);
                  } else {
                      this.formChippy.debug.info(`Already at first slide (${currentIndex}), cannot go back`);
                  }
              });
          });
          
          // Save buttons for later reference
          this.formChippy.debug.info(`Set up ${this.prevButtons.length} previous buttons`);
  
  
          // ===== SUBMIT BUTTON =====
          const submitButton = this.formChippy.container.querySelector(
              this.options.submitSelector
          );
  
          if (submitButton) {
              // Remove existing click listeners for consistency
              const newSubmitButton = submitButton.cloneNode(true);
              submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
              
              // Store reference
              this.submitButton = newSubmitButton;
              
              // Add new event listener
              newSubmitButton.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  this.formChippy.debug.info('Submit button clicked');
                  this._handleSubmit();
              });
              
              this.formChippy.debug.info('Submit button set up');
          }
      }
      
      /**
       * Finds the active slide in the DOM by looking for the active class
       * @returns {HTMLElement|null} The active slide or null if not found
       * @private
       */
      _findActiveSlide() {
          const activeClass = this.formChippy.options.activeClass;
          // Search within the slide list instead of the entire container
          const activeSlide = this.formChippy.slideList.querySelector(`[data-fc-slide].${activeClass}`);
          
          if (activeSlide) {
              return activeSlide;
          }
          
          // Second attempt: check if any slide has the active class
          for (const slide of this.formChippy.slides) {
              if (slide.classList.contains(activeClass)) {
                  return slide;
              }
          }
          
          return null;
      }
  
      /**
       * Set up keyboard navigation
       * @private
       */
      _setupKeyboardNavigation() {
          document.addEventListener('keydown', (e) => {
              // Ignore if inside a text input
              if (
                  e.target.tagName === 'INPUT' &&
                  (e.target.type === 'text' ||
                      e.target.type === 'email' ||
                      e.target.type === 'number')
              ) {
                  // Allow Enter key to trigger button
                  if (e.key === 'Enter') {
                      const activeSlide = this._findActiveSlide();
                      const slideToDetermineButton = activeSlide || 
                          this.formChippy.slides[this.formChippy.currentSlideIndex];
                          
                      const button = slideToDetermineButton.querySelector(this.options.buttonSelector);
                      if (button) button.click();
                      e.preventDefault();
                  }
                  return
              }
  
              // Find active slide to determine actual current index
              const activeSlide = this._findActiveSlide();
              let currentIndex = this.formChippy.currentSlideIndex;
              
              if (activeSlide) {
                  const activeIndex = Array.from(this.formChippy.slides).indexOf(activeSlide);
                  if (activeIndex !== -1 && activeIndex !== currentIndex) {
                      this.formChippy.debug.info(`Keyboard: Updating current index from ${currentIndex} to ${activeIndex} based on DOM state`);
                      currentIndex = activeIndex;
                      this.formChippy.currentSlideIndex = activeIndex;
                  }
              }
                  
              // Navigation keys
              switch (e.key) {
                  case 'ArrowDown':
                  case 'PageDown':
                      if (currentIndex < this.formChippy.totalSlides - 1) {
                          this.formChippy.goToSlide(currentIndex + 1);
                          e.preventDefault();
                      }
                      break
  
                  case 'ArrowUp':
                  case 'PageUp':
                      if (currentIndex > 0) {
                          this.formChippy.goToSlide(currentIndex - 1);
                          e.preventDefault();
                      }
                      break
  
                  case 'Home':
                      // Go to first slide
                      this.formChippy.debug.info('Keyboard navigation: Home key - going to first slide');
                      this.formChippy.goToSlide(0);
                      e.preventDefault();
                      break
  
                  case 'End':
                      // Go to last slide
                      const lastIndex = this.formChippy.totalSlides - 1;
                      this.formChippy.debug.info(`Keyboard navigation: End key - going to last slide (${lastIndex})`);
                      this.formChippy.goToSlide(lastIndex);
                      e.preventDefault();
                      break
              }
          })
      }
  
      /**
       * Set up intersection observer to detect active slide
       * @private
       */
      _setupIntersectionObserver() {
          // Create observer - but only update UI elements, do not auto-navigate
          this.observer = new IntersectionObserver(
              (entries) => {
                  entries.forEach((entry) => {
                      if (
                          entry.isIntersecting &&
                          entry.intersectionRatio >= 0.5 &&
                          !this.formChippy.isAnimating // Prevent updates during programmatic scrolling
                      ) {
                          const index = this.formChippy.slides.indexOf(
                              entry.target
                          )
                          if (index !== -1) {
                              // Log that we detected a slide in view via IntersectionObserver
                              const slideId = entry.target.getAttribute('data-fc-slide');
                              
                              if (index !== this.formChippy.currentSlideIndex) {
                                  this.formChippy.debug.info(`IntersectionObserver: Slide ${slideId} is in view, updating from index ${this.formChippy.currentSlideIndex} to ${index}`);
                                  
                                  // Update the stored current index to match what's visible
                                  this.formChippy.currentSlideIndex = index;
                                  
                                  // Update visual indicators
                                  this.formChippy._updateActiveVisuals(index);
                              }
                          }
                      }
                  })
              },
              { threshold: 0.5 }
          )
  
          // Observe all slides
          this.formChippy.slides.forEach((slide) => {
              this.observer.observe(slide)
          })
      }
  
      /**
       * Handle form submission
       * @private
       */
      _handleSubmit() {
          // Find the active slide in the DOM first
          const activeSlide = this._findActiveSlide();
          let currentSlide;
          
          if (activeSlide) {
              // Use the active slide from the DOM
              currentSlide = activeSlide;
              
              // Update the stored index if it doesn't match the active slide
              const activeIndex = Array.from(this.formChippy.slides).indexOf(activeSlide);
              if (activeIndex !== -1 && activeIndex !== this.formChippy.currentSlideIndex) {
                  this.formChippy.debug.info(`Submit: Updating current index from ${this.formChippy.currentSlideIndex} to ${activeIndex} based on DOM state`);
                  this.formChippy.currentSlideIndex = activeIndex;
              }
          } else {
              // Fall back to the stored index if no active slide is found
              currentSlide = this.formChippy.slides[this.formChippy.currentSlideIndex];
          }
          
          // Log the submission attempt
          const slideId = currentSlide.getAttribute('data-fc-slide');
          this.formChippy.debug.info(
              `Form submission attempted from slide ${slideId}`,
              {
                  slide: slideId,
                  slideIndex: this.formChippy.currentSlideIndex,
                  validationEnabled: this.formChippy.validationEnabled
              }
          )
  
          // Only validate if validation is enabled
          let isValid = true;
          if (this.formChippy.validationEnabled) {
              isValid = this.formChippy.validation.validateSlide(currentSlide);
          } else {
              this.formChippy.debug.info('Submit: Skipping validation because validation is disabled');
          }
  
          // Log the validation result's effect on form submission
          this._logNavigationValidation(isValid, 'submit')
  
          if (!isValid) {
              this._highlightInvalidInputs(lastSlide)
              return
          }
  
          // Collect form data from all slides, not just the current one
          const formData = this._collectFormData()
  
          // Log successful form data collection
          this.formChippy.debug.info('Form data collected successfully', {
              fieldsCount: Object.keys(formData).length,
          })
  
          // Trigger submit event
          const submitEvent = new CustomEvent('formchippy:submit', {
              detail: {
                  formName: this.formChippy.formName,
                  formData: formData,
              },
              bubbles: true,
          })
  
          this.formChippy.container.dispatchEvent(submitEvent)
  
          console.log(
              `Form '${this.formChippy.formName}' submitted with data:`,
              formData
          )
      }
  
      /**
       * Collect form data from all inputs
       * @returns {Object} - Form data
       * @private
       */
      _collectFormData() {
          const formData = {}
  
          this.formChippy.slides.forEach((slide) => {
              const slideId = slide.getAttribute('data-fc-slide')
              const inputs = slide.querySelectorAll(this.options.inputSelector)
  
              inputs.forEach((input, inputIndex) => {
                  const inputName =
                      input.getAttribute('name') ||
                      `${slideId}-input-${inputIndex}`
  
                  // Handle different input types
                  if (input.type === 'radio' || input.type === 'checkbox') {
                      if (input.checked) {
                          formData[inputName] = input.value
                      }
                  } else {
                      formData[inputName] = input.value
                  }
              })
          })
  
          // Store in formChippy instance
          this.formChippy.formData = formData
  
          return formData
      }
  
      /**
       * Clean up when destroying the form
       */
      destroy() {
          // Disconnect observer
          if (this.observer) {
              this.observer.disconnect()
          }
      }
  
      /**
       * Log navigation validation status in debug
       * @param {boolean} isValid - Whether validation passed
       * @param {string} direction - Navigation direction ('next', 'prev', 'submit')
       * @private
       */
      _logNavigationValidation(isValid, direction) {
          if (!this.formChippy.debug || !this.formChippy.debug.enabled) return
  
          // Create detailed message for debug panel
          const currentSlide =
              this.formChippy.slides[this.formChippy.currentSlideIndex]
          const slideId = currentSlide.getAttribute('data-fc-slide')
          const slideTitle =
              currentSlide.querySelector('[data-fc-slide-title]')?.textContent ||
              `Slide ${this.formChippy.currentSlideIndex + 1}`
  
          const message = isValid
              ? `✓ Navigation ${direction} allowed from slide ${slideId}`
              : `⚠️ Navigation ${direction} blocked due to validation errors on slide ${slideId}`
  
          const logLevel = isValid ? 'info' : 'warn'
  
          this.formChippy.debug[logLevel](message, {
              navigation: {
                  allowed: isValid,
                  direction,
                  fromSlide: {
                      id: slideId,
                      index: this.formChippy.currentSlideIndex,
                      title: slideTitle,
                  },
              },
          })
  
          // Update UI if debug UI is enabled
          if (
              this.formChippy.debug.logToUI &&
              this.formChippy.debug.logContainer
          ) {
              this._updateNavigationValidationUI(isValid, direction, slideId)
          }
      }
  
      /**
       * Update the navigation validation status in the debug UI
       * @param {boolean} isValid - Whether validation passed
       * @param {string} direction - Navigation direction
       * @param {string} slideId - Current slide ID
       * @private
       */
      _updateNavigationValidationUI(isValid, direction, slideId) {
          const debugContainer = this.formChippy.debug.logContainer
          if (!debugContainer) return
  
          // Create or update navigation validation section
          let navValidation = debugContainer.querySelector(
              '.fc-debug-nav-validation'
          )
  
          if (!navValidation) {
              navValidation = document.createElement('div')
              navValidation.className = `fc-debug-nav-validation ${
                  isValid ? 'allowed' : 'blocked'
              }`
              debugContainer.appendChild(navValidation)
          } else {
              navValidation.className = `fc-debug-nav-validation ${
                  isValid ? 'allowed' : 'blocked'
              }`
          }
  
          const icon = isValid ? '✓' : '⚠️'
          const status = isValid ? 'allowed' : 'blocked'
  
          navValidation.innerHTML = `
              <span class="fc-debug-nav-icon">${icon}</span>
              <span class="fc-debug-nav-message">
                  Navigation <strong>${direction}</strong> ${status} from slide ${slideId}
                  ${
                      !isValid
                          ? '<br><small>Fix validation errors to proceed</small>'
                          : ''
                  }
              </span>
          `
  
          // Auto-remove after 5 seconds
          setTimeout(() => {
              if (navValidation && navValidation.parentNode) {
                  navValidation.parentNode.removeChild(navValidation)
              }
          }, 5000)
      }
  
      /**
       * Highlight invalid inputs for better visibility
       * @param {HTMLElement} slide - Slide to highlight invalid inputs on
       * @private
       */
      _highlightInvalidInputs(slide) {
          const invalidInputs = slide.querySelectorAll('.fc-error')
  
          // Add pulse animation to error messages
          invalidInputs.forEach((input) => {
              const errorMessage = input
                  .closest('[data-fc-question]')
                  ?.querySelector('.fc-error-message')
              if (errorMessage) {
                  // Apply pulse animation
                  errorMessage.classList.add('fc-pulse-error')
  
                  // Remove animation class after animation completes
                  setTimeout(() => {
                      errorMessage.classList.remove('fc-pulse-error')
                  }, 820) // Slightly longer than animation duration
              }
          })
  
          // Focus the first invalid input
          if (invalidInputs.length > 0) {
              setTimeout(() => {
                  invalidInputs[0].focus()
              }, 100)
          }
  
          // Mark the Next button as invalid
          this._updateNextButtonState(false)
      }
  
      /**
       * Update the state of the Next button based on validation
       * @param {boolean} isValid - Whether the current slide is valid
       * @private
       */
      _updateNextButtonState(isValid) {
          // Get all next buttons in the current slide
          const currentSlide =
              this.formChippy.slides[this.formChippy.currentSlideIndex]
          const slideNextButtons = currentSlide.querySelectorAll(
              `${this.options.buttonSelector}:not(${this.options.submitSelector}):not([data-fc-button-prev])`
          )
  
          // Update button visual state
          slideNextButtons.forEach((button) => {
              if (isValid) {
                  button.classList.remove(
                      'fc-button-invalid',
                      'invalid',
                      'disabled'
                  )
                  button.removeAttribute('disabled')
              } else {
                  button.classList.add('fc-button-invalid', 'invalid')
                  // Do not disable the button completely as we still want it clickable to show validation errors
                  // but we want to indicate it's not a valid action yet
              }
          })
      }
      
      /**
       * Update the slide counter in the container
       * @param {number} currentIndex - Current slide index (0-based)
       */
      updateSlideCounter(currentIndex) {
          // Add a data attribute to the container showing current slide / total slides
          const totalSlides = this.formChippy.totalSlides;
          const humanIndex = currentIndex + 1; // Convert to 1-based for display
          
          // Set the attribute on the container
          this.formChippy.container.setAttribute('data-fc-formprogress', `${humanIndex}/${totalSlides}`);
          
          // Also create/update a visually hidden text element for screen readers
          let srCounter = this.formChippy.container.querySelector('.fc-sr-counter');
          
          if (!srCounter) {
              srCounter = document.createElement('div');
              srCounter.className = 'fc-sr-counter';
              srCounter.setAttribute('aria-live', 'polite');
              srCounter.style.position = 'absolute';
              srCounter.style.width = '1px';
              srCounter.style.height = '1px';
              srCounter.style.overflow = 'hidden';
              srCounter.style.clip = 'rect(0, 0, 0, 0)';
              this.formChippy.container.appendChild(srCounter);
          }
          
          srCounter.textContent = `Step ${humanIndex} of ${totalSlides}`;
          
          // Update button states (enable/disable) based on current position
          this.updateButtonStates(currentIndex);
      }
      
      /**
       * Update navigation button states based on current position
       * @param {number} currentIndex - Current slide index
       */
      updateButtonStates(currentIndex) {
          const totalSlides = this.formChippy.totalSlides;
          const disabledClass = 'fc-button-disabled';
          
          this.formChippy.debug.info(`Updating button states for index ${currentIndex}, totalSlides=${totalSlides}`);
          
          // Find all prev buttons in the container
          const prevButtons = Array.from(this.formChippy.container.querySelectorAll(
              '[data-fc-button="prev"], [data-fc-button-prev]'
          ));
          
          // Find all next buttons in the container
          const nextButtons = Array.from(this.formChippy.container.querySelectorAll(
              '[data-fc-button="next"], [data-fc-button-next]'
          ));
          
          // Update previous buttons
          if (prevButtons && prevButtons.length > 0) {
              this.formChippy.debug.info(`Found ${prevButtons.length} prev buttons to update`);
              prevButtons.forEach(button => {
                  // Disable prev buttons on first slide
                  if (currentIndex === 0) {
                      button.classList.add(disabledClass);
                      button.setAttribute('aria-disabled', 'true');
                  } else {
                      button.classList.remove(disabledClass);
                      button.setAttribute('aria-disabled', 'false');
                  }
              });
          }
          
          // Update next buttons
          if (nextButtons && nextButtons.length > 0) {
              this.formChippy.debug.info(`Found ${nextButtons.length} next buttons to update`);
              nextButtons.forEach(button => {
                  // Check if this is a special button with a go-to attribute
                  const hasGoTo = button.hasAttribute('data-fc-go-to');
                  
                  // Only disable regular next buttons on last slide
                  if (!hasGoTo && currentIndex === totalSlides - 1) {
                      button.classList.add(disabledClass);
                      button.setAttribute('aria-disabled', 'true');
                  } else {
                      button.classList.remove(disabledClass);
                      button.setAttribute('aria-disabled', 'false');
                  }
              });
          }
      }
  }
  
  
  /**
   * Validation.js
   * Handles form input validation
   */
  
  class Validation {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
      }
      
      /**
       * Validate a slide's inputs
       * @param {HTMLElement} slide - The slide to validate
       * @returns {boolean} - True if valid, false otherwise
       */
      validateSlide(slide) {
          const slideId = slide.getAttribute('data-fc-slide');
          
          // Check if validation is enabled via the data attribute
          if (!this.formChippy.validationEnabled) {
              this.formChippy.debug.info(`Validation skipped (disabled) for slide: ${slideId}`);
              return true; // Skip validation and return valid
          }
          
          this.formChippy.debug.info(`Validating slide: ${slideId}`);
          
          const inputs = slide.querySelectorAll(this.options.inputSelector);
          let isValid = true;
  
          inputs.forEach((input) => {
              // Clear previous errors
              this.clearInputError(input);
  
              // Skip if not required and empty
              if (
                  !input.hasAttribute('required') &&
                  input.value.trim() === ''
              ) {
                  return;
              }
  
              // Check if empty
              if (
                  input.hasAttribute('required') &&
                  input.value.trim() === ''
              ) {
                  this.showInputError(input, 'This field is required');
                  isValid = false;
                  return;
              }
  
              // Email validation
              if (
                  input.type === 'email' &&
                  input.value.trim() !== '' &&
                  !this.validateEmail(input.value)
              ) {
                  this.showInputError(
                      input,
                      'Please enter a valid email address'
                  );
                  isValid = false;
                  return;
              }
  
              // Number validation
              if (input.type === 'number' && input.value.trim() !== '') {
                  const min = parseFloat(input.getAttribute('min'));
                  const max = parseFloat(input.getAttribute('max'));
                  const value = parseFloat(input.value);
  
                  if (isNaN(value)) {
                      this.showInputError(
                          input,
                          'Please enter a valid number'
                      );
                      isValid = false;
                      return;
                  }
  
                  if (!isNaN(min) && value < min) {
                      this.showInputError(input, `Minimum value is ${min}`);
                      isValid = false;
                      return;
                  }
  
                  if (!isNaN(max) && value > max) {
                      this.showInputError(input, `Maximum value is ${max}`);
                      isValid = false;
                      return;
                  }
              }
              
              // Custom validation
              const pattern = input.getAttribute('pattern');
              if (pattern && input.value.trim() !== '') {
                  const regex = new RegExp(pattern);
                  if (!regex.test(input.value)) {
                      const errorMsg = input.getAttribute('data-error-message') || 
                                      'Please enter a valid value';
                      this.showInputError(input, errorMsg);
                      isValid = false;
                      return;
                  }
              }
          });
  
          return isValid;
      }
  
      /**
       * Validate email address
       * @param {string} email - Email to validate
       * @returns {boolean} - True if valid, false otherwise
       */
      validateEmail(email) {
          const re =
              /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
          return re.test(String(email).toLowerCase());
      }
  
      /**
       * Show input error
       * @param {HTMLElement} input - Input element
       * @param {string} message - Error message
       */
      showInputError(input, message) {
          // Log validation error
          this.formChippy.debug.logValidation(input, false, message);
          
          // Check if input is empty and add empty class if needed
          if (input.value.trim() === '') {
              input.classList.add('fc-empty', 'empty');
          } else {
              input.classList.remove('fc-empty', 'empty');
          }
          
          input.style.borderColor = 'var(--fc-error-color, var(--mct-error-color, #ff3860))';
          input.classList.add('fc-error', 'error');
  
          // Find question container
          const questionContainer =
              input.closest('[data-fc-question]') || input.parentNode;
  
          // Add error class to the question container
          questionContainer.classList.add('fc-has-error', 'has-error');
          
          // Create error message
          let errorElement =
              questionContainer.querySelector('.fc-error-message');
          if (!errorElement) {
              errorElement = document.createElement('div');
              errorElement.className = 'fc-error-message';
              errorElement.style.color = 'var(--fc-error-color, var(--mct-error-color, #ff3860))';
              errorElement.style.fontSize = '0.875rem';
              errorElement.style.marginTop = '-1rem';
              errorElement.style.marginBottom = '1rem';
              questionContainer.appendChild(errorElement);
          }
  
          errorElement.textContent = message;
  
          // Focus the input
          input.focus();
      }
  
      /**
       * Clear input error
       * @param {HTMLElement} input - Input element
       */
      clearInputError(input) {
          // Log validation success
          if (input.classList.contains('fc-error')) {
              this.formChippy.debug.logValidation(input, true);
          }
          
          input.style.borderColor = '';
          input.classList.remove('fc-error', 'error');
          
          // Check if input is empty and update empty class accordingly
          if (input.value.trim() === '') {
              input.classList.add('fc-empty', 'empty');
          } else {
              input.classList.remove('fc-empty', 'empty');
          }
  
          // Find question container
          const questionContainer =
              input.closest('[data-fc-question]') || input.parentNode;
  
          // Remove error class from question container
          questionContainer.classList.remove('fc-has-error', 'has-error');
          
          // Remove error message
          const errorElement =
              questionContainer.querySelector('.fc-error-message');
          if (errorElement) {
              errorElement.remove();
          }
      }
  }
  
  
  /**
   * Progress.js
   * Handles progress indicators and navigation dots
   */
  
  class Progress {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          this.dots = [];
      }
  
      /**
       * Create navigation dots
       * If a template dot exists in the dots container, it will be used as a template for generating all dots
       */
      createNavigationDots() {
          if (!this.formChippy.dotsContainer) return;
          
          // Check for template dot
          const templateDot = this.formChippy.dotsContainer.querySelector('[data-fc-dot]');
          const hasTemplate = templateDot !== null;
          
          // Store template before clearing if it exists
          const dotTemplate = hasTemplate ? templateDot.cloneNode(true) : null;
          
          // Clear existing dots
          this.formChippy.dotsContainer.innerHTML = '';
          
          this.formChippy.debug.info(`Creating navigation dots${hasTemplate ? ' using template' : ''}`);
          
          // Create dots for each slide
          this.formChippy.slides.forEach((slide, index) => {
              let dot;
              
              if (hasTemplate) {
                  // Use the template if available
                  dot = dotTemplate.cloneNode(true);
                  
                  // Clear any existing click events by cloning without events
                  const newDot = dot.cloneNode(true);
                  dot.parentNode?.replaceChild(newDot, dot);
                  dot = newDot;
              } else {
                  // Create a new dot from scratch
                  dot = document.createElement('div');
                  dot.setAttribute('data-fc-dot', '');
              }
              
              // Set common attributes regardless of template usage
              dot.setAttribute('data-index', index);
              dot.setAttribute('data-slide', slide.getAttribute('data-fc-slide') || `slide-${index + 1}`);
              dot.setAttribute('role', 'button');
              dot.setAttribute('tabindex', '0');
              dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
              
              // Add click event
              dot.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  this.formChippy.goToSlide(index);
              });
              
              // Add keyboard event for accessibility
              dot.addEventListener('keypress', (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      this.formChippy.goToSlide(index);
                  }
              });
              
              // Add to container
              this.formChippy.dotsContainer.appendChild(dot);
          });
  
          // Store dots for later use
          this.dots = Array.from(
              this.formChippy.dotsContainer.querySelectorAll(this.options.dotSelector)
          );
          
          // Set initial active dot
          this.updateProgress(this.formChippy.currentSlideIndex);
      }
  
      /**
       * Create or update the progress bar structure
       * Creates a proper progress-wrap and progress-bar structure
       */
      createProgressBar() {
          // Get the progress container
          const progressContainer = this.formChippy.container.querySelector(this.options.progressSelector);
          if (!progressContainer) return;
          
          // Clear existing content
          progressContainer.innerHTML = '';
          
          // Create proper progress bar structure
          const progressWrap = document.createElement('div');
          progressWrap.classList.add('fc-progress-wrap');
          progressWrap.setAttribute('data-fc-progress-wrap', '');
          progressWrap.setAttribute('role', 'progressbar');
          progressWrap.setAttribute('aria-valuemin', '0');
          progressWrap.setAttribute('aria-valuemax', '100');
          progressWrap.setAttribute('aria-valuenow', '0');
          
          const progressBar = document.createElement('div');
          progressBar.classList.add('fc-progress-bar');
          progressBar.setAttribute('data-fc-progress-bar', '');
          
          const progressFill = document.createElement('div');
          progressFill.classList.add('fc-progress-fill');
          progressFill.setAttribute('data-fc-progress-fill', '');
          
          // Assemble the structure
          progressBar.appendChild(progressFill);
          progressWrap.appendChild(progressBar);
          progressContainer.appendChild(progressWrap);
          
          // Store reference to the fill element
          this.formChippy.progressBar = progressFill;
      }
      
      /**
       * Update progress indicators based on current slide
       * @param {number} index - Current slide index
       */
      updateProgress(index) {
          // Update dots
          if (this.dots && this.dots.length > 0) {
              this.dots.forEach((dot, i) => {
                  if (i === index) {
                      // Set active class and ARIA attributes for the active dot
                      dot.classList.add(this.options.activeClass);
                      dot.setAttribute('aria-current', 'true');
                      
                      // Make sure it's properly tabbable for keyboard navigation
                      dot.setAttribute('tabindex', '0');
                      
                      // Log which dot is active for debugging
                      if (this.formChippy.debug && this.formChippy.debug.enabled) {
                          const slideId = dot.getAttribute('data-slide');
                          this.formChippy.debug.info(`Navigation dot activated for slide: ${slideId}`, {
                              index: i,
                              slideId: slideId
                          });
                      }
                  } else {
                      // Remove active class and attributes from inactive dots
                      dot.classList.remove(this.options.activeClass);
                      dot.removeAttribute('aria-current');
                      dot.setAttribute('tabindex', '0'); // Keep tabbable but not current
                  }
              });
          }
  
          // Update progress bar using the position tracker as source of truth
          if (this.formChippy.progressBar) {
              // Get the true progress percentage based on current index
              const slideTracker = this.formChippy._slidePositionTracker;
              const totalSlides = this.formChippy.totalSlides;
              
              // Calculate progress based on true current slide position
              let progress;
              if (slideTracker) {
                  // Use the position tracker for more accurate progress
                  progress = ((slideTracker.currentIndex + 1) / totalSlides) * 100;
                  this.formChippy.debug.info(`Progress updated from tracker: ${progress.toFixed(1)}%`, {
                      currentIndex: slideTracker.currentIndex,
                      totalSlides: totalSlides
                  });
              } else {
                  // Fallback to standard calculation
                  progress = ((index + 1) / totalSlides) * 100;
              }
              
              // Get the correct elements (specifically targeting the fill element)
              let progressFill = this.formChippy.progressBar;
              
              // If not already set, find it first
              if (!progressFill) {
                  progressFill = this.formChippy.container.querySelector('[data-fc-progress-fill]');
                  if (progressFill) {
                      // Store for future use
                      this.formChippy.progressBar = progressFill;
                  }
              }
              
              // Apply the width change to the fill element
              if (progressFill) {
                  progressFill.style.width = `${progress}%`;
                  this.formChippy.debug.info(`Setting progress fill width to ${progress}%`);
              }
              
              // Also update ARIA attributes on the wrapper
              const progressWrap = this.formChippy.container.querySelector('[data-fc-progress-wrap]');
              if (progressWrap) {
                  progressWrap.setAttribute('aria-valuenow', progress);
              }
          }
      }
      
      /**
       * Clean up when destroying the form
       */
      destroy() {
          // Remove dots
          if (this.formChippy.dotsContainer) {
              this.formChippy.dotsContainer.innerHTML = '';
          }
      }
  }
  
  
  /**
   * Debug.js
   * Provides debugging capabilities for FormChippy
   */
  
  class Debug {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          this.enabled = false;
          this.logToConsole = true;
          this.logToUI = false;
          this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
          this.logContainer = null;
          this.logs = [];
          this.maxLogs = 100;
          
          // Initialize
          this._init();
      }
      
      /**
       * Initialize debug functionality
       * @private
       */
      _init() {
          // Check if debugging is enabled
          const container = this.formChippy.container;
          if (!container) return;
          
          // Check for debug flag in container attributes
          const debugAttr = container.getAttribute('data-fc-debuglog');
          this.enabled = debugAttr === 'true' || debugAttr === '';
          
          // Check for debug options in container attributes
          this.logToConsole = container.getAttribute('data-fc-debuglog-console') !== 'false';
          this.logToUI = container.getAttribute('data-fc-debuglog-ui') === 'true';
          
          // Set log level
          const logLevel = container.getAttribute('data-fc-debuglog-level') || 'info';
          if (['debug', 'info', 'warn', 'error'].includes(logLevel)) {
              this.logLevel = logLevel;
          }
          
          // Create log UI if enabled
          if (this.enabled && this.logToUI) {
              this._createLogUI();
          }
          
          // Log initialization
          if (this.enabled) {
              this.info('FormChippy Debug initialized', {
                  level: this.logLevel,
                  console: this.logToConsole,
                  ui: this.logToUI
              });
              
              // Map slides and inputs for debugging purposes
              this.mapSlidesAndInputs();
          }
      }
      
      /**
       * Create UI for logging
       * @private
       */
      _createLogUI() {
          // Create log container
          this.logContainer = document.createElement('div');
          this.logContainer.className = 'fc-debug-log';
          this.logContainer.innerHTML = `
              <div class="fc-debug-header">
                  <h3>FormChippy Debug Log</h3>
                  <div class="fc-debug-actions">
                      <button class="fc-debug-clear" title="Clear logs">Clear</button>
                      <button class="fc-debug-minimize" title="Minimize">−</button>
                  </div>
              </div>
              <div class="fc-debug-content"></div>
          `;
          
          // Add to DOM
          document.body.appendChild(this.logContainer);
          
          // Get content container
          this.logContent = this.logContainer.querySelector('.fc-debug-content');
          
          // Add validation status indicator to the log content
          const validationStatus = document.createElement('div');
          validationStatus.className = 'fc-debug-validation-status';
          validationStatus.innerHTML = `
              <span class="fc-debug-label">Validation Status:</span>
              <span class="fc-debug-value fc-status-${this.formChippy.validationEnabled ? 'enabled' : 'disabled'}">
                  ${this.formChippy.validationEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
              <span class="fc-debug-note">(Set by data-fc-validate attribute)</span>
          `;
          this.logContent.appendChild(validationStatus);
          
          // Set up event listeners
          const clearBtn = this.logContainer.querySelector('.fc-debug-clear');
          clearBtn.addEventListener('click', () => this.clearLogs());
          
          const minimizeBtn = this.logContainer.querySelector('.fc-debug-minimize');
          minimizeBtn.addEventListener('click', () => {
              this.logContainer.classList.toggle('fc-debug-minimized');
              minimizeBtn.textContent = this.logContainer.classList.contains('fc-debug-minimized') ? '+' : '−';
          });
          
          // Make draggable
          this._makeDraggable(this.logContainer);
      }
      
      /**
       * Map all slides and their input fields for debugging
       * Shows the structure of the form and what inputs are in each slide
       * @public
       */
      mapSlidesAndInputs() {
          if (!this.enabled) return;
          
          const slideMap = [];
          const slides = this.formChippy.slides;
          
          this.info('Mapping slides and inputs...');
          
          slides.forEach((slide, index) => {
              // Get slide ID or index if no ID
              const slideId = slide.getAttribute('data-fc-slide') || `slide-${index}`;
              
              // Find all input elements in this slide
              const inputs = slide.querySelectorAll('input, select, textarea');
              const inputMap = [];
              
              inputs.forEach(input => {
                  const inputInfo = {
                      type: input.type || input.tagName.toLowerCase(),
                      name: input.name || input.id || 'unnamed-input',
                      id: input.id || '',
                      required: input.required || false,
                      initialValue: input.value || ''
                  };
                  
                  // Add event listener to log value changes
                  input.addEventListener('change', () => {
                      this.logInputChange(slideId, inputInfo.name, input.value);
                  });
                  
                  inputMap.push(inputInfo);
              });
              
              slideMap.push({
                  index,
                  id: slideId,
                  title: slide.querySelector('[data-fc-slide-title]')?.textContent || '',
                  inputCount: inputs.length,
                  inputs: inputMap
              });
          });
          
          // Log the complete map
          this.debug('Form structure map', slideMap);
          
          // Create visual representation if UI logging is enabled
          if (this.logToUI) {
              this._createFormProgressMap(slideMap);
          }
          
          // Save the map for future reference
          this.slideMap = slideMap;
          
          return slideMap;
      }
      
      /**
       * Log when input values change
       * @param {string} slideId - Slide identifier
       * @param {string} inputName - Input field name
       * @param {string} value - New input value
       * @public
       */
      logInputChange(slideId, inputName, value) {
          if (!this.enabled) return;
          
          this.debug(`Input change on slide ${slideId}`, {
              input: inputName,
              value: value,
              timestamp: new Date().toISOString()
          });
      }
      
      /**
       * Get the current values of all inputs in the form
       * @returns {Object} Object with slide IDs as keys and input values as nested objects
       * @public
       */
      getAllFormValues() {
          if (!this.formChippy || !this.formChippy.slides) return {};
          
          const formData = {};
          const slides = this.formChippy.slides;
          
          slides.forEach((slide, index) => {
              const slideId = slide.getAttribute('data-fc-slide') || `slide-${index}`;
              formData[slideId] = {};
              
              // Find all input elements in this slide
              const inputs = slide.querySelectorAll('input, select, textarea');
              
              inputs.forEach(input => {
                  // Handle different input types
                  const name = input.name || input.id || `unnamed-input-${index}`;
                  
                  if (input.type === 'checkbox' || input.type === 'radio') {
                      formData[slideId][name] = input.checked;
                  } else {
                      formData[slideId][name] = input.value;
                  }
              });
          });
          
          this.info('Current form values', formData);
          return formData;
      }
      
      /**
       * Create visual form progress map in the debug UI
       * @param {Array} slideMap - Mapped slide data
       * @private
       */
      _createFormProgressMap(slideMap) {
          if (!this.logContainer) return;
          
          // Create container for the form map
          const mapContainer = document.createElement('div');
          mapContainer.className = 'fc-debug-form-map';
          mapContainer.innerHTML = `
              <div class="fc-debug-map-header">
                  <h4>Form Structure Map</h4>
                  <span class="fc-debug-map-count">${slideMap.length} slides</span>
              </div>
              <div class="fc-debug-map-content"></div>
          `;
          
          const mapContent = mapContainer.querySelector('.fc-debug-map-content');
          
          // Create slide indicators
          slideMap.forEach((slide, i) => {
              const slideEl = document.createElement('div');
              slideEl.className = 'fc-debug-map-slide';
              slideEl.dataset.slideIndex = i;
              slideEl.innerHTML = `
                  <div class="fc-debug-map-slide-header">
                      <span class="fc-debug-map-slide-number">${i + 1}</span>
                      <span class="fc-debug-map-slide-title">${slide.title || slide.id}</span>
                      <span class="fc-debug-map-slide-inputs">${slide.inputCount} inputs</span>
                  </div>
                  <div class="fc-debug-map-slide-inputs-list"></div>
              `;
              
              // Add input fields
              const inputsList = slideEl.querySelector('.fc-debug-map-slide-inputs-list');
              slide.inputs.forEach(input => {
                  const inputEl = document.createElement('div');
                  inputEl.className = 'fc-debug-map-input';
                  inputEl.innerHTML = `
                      <span class="fc-debug-map-input-name">${input.name}</span>
                      <span class="fc-debug-map-input-type">${input.type}</span>
                      ${input.required ? '<span class="fc-debug-map-input-required">required</span>' : ''}
                  `;
                  inputsList.appendChild(inputEl);
              });
              
              // Add click handler to highlight current slide
              slideEl.addEventListener('click', () => {
                  this.formChippy.goToSlide(i);
              });
              
              mapContent.appendChild(slideEl);
          });
          
          // Make current slide indicator update with navigation
          this.formChippy.container.addEventListener('fc:slidechange', (e) => {
              const currentIndex = e.detail.index;
              const slideEls = mapContent.querySelectorAll('.fc-debug-map-slide');
              
              slideEls.forEach((el, i) => {
                  if (i === currentIndex) {
                      el.classList.add('fc-debug-map-slide-current');
                  } else {
                      el.classList.remove('fc-debug-map-slide-current');
                  }
              });
              
              // Also log all current values
              this.getAllFormValues();
          });
          
          // Add the map to the debug UI
          this.logContainer.appendChild(mapContainer);
      }
      
      /**
       * Make an element draggable
       * @param {HTMLElement} element - The element to make draggable
       * @private
       */
      _makeDraggable(element) {
          const header = element.querySelector('.fc-debug-header');
          let isDragging = false;
          let offsetX, offsetY;
          
          header.addEventListener('mousedown', (e) => {
              isDragging = true;
              offsetX = e.clientX - element.getBoundingClientRect().left;
              offsetY = e.clientY - element.getBoundingClientRect().top;
              
              element.style.cursor = 'grabbing';
          });
          
          document.addEventListener('mousemove', (e) => {
              if (!isDragging) return;
              
              const x = e.clientX - offsetX;
              const y = e.clientY - offsetY;
              
              element.style.left = `${x}px`;
              element.style.top = `${y}px`;
          });
          
          document.addEventListener('mouseup', () => {
              isDragging = false;
              element.style.cursor = '';
          });
      }
      
      /**
       * Log a message with a specified level
       * @param {string} level - Log level
       * @param {string} message - Log message
       * @param {object} data - Additional data to log
       * @private
       */
      _log(level, message, data = null) {
          if (!this.enabled) return;
          
          // Check log level
          const levels = { debug: 0, info: 1, warn: 2, error: 3 };
          if (levels[level] < levels[this.logLevel]) return;
          
          // Create log entry
          const timestamp = new Date().toISOString();
          const logEntry = {
              level,
              message,
              data,
              timestamp
          };
          
          // Add to logs array
          this.logs.push(logEntry);
          
          // Trim logs if exceeding max
          if (this.logs.length > this.maxLogs) {
              this.logs = this.logs.slice(-this.maxLogs);
          }
          
          // Log to console
          if (this.logToConsole) {
              const formattedData = data ? JSON.stringify(data, null, 2) : '';
              
              switch (level) {
                  case 'debug':
                      console.debug(`[FormChippy Debug] ${message}`, data || '');
                      break;
                  case 'info':
                      console.info(`[FormChippy Info] ${message}`, data || '');
                      break;
                  case 'warn':
                      console.warn(`[FormChippy Warning] ${message}`, data || '');
                      break;
                  case 'error':
                      console.error(`[FormChippy Error] ${message}`, data || '');
                      break;
              }
          }
          
          // Log to UI
          if (this.logToUI && this.logContent) {
              const logItem = document.createElement('div');
              logItem.className = `fc-debug-item fc-debug-${level}`;
              
              const time = new Date(timestamp).toLocaleTimeString();
              
              logItem.innerHTML = `
                  <span class="fc-debug-time">${time}</span>
                  <span class="fc-debug-level">${level.toUpperCase()}</span>
                  <span class="fc-debug-message">${message}</span>
                  ${data ? `<pre class="fc-debug-data">${JSON.stringify(data, null, 2)}</pre>` : ''}
              `;
              
              this.logContent.appendChild(logItem);
              
              // Scroll to bottom
              this.logContent.scrollTop = this.logContent.scrollHeight;
          }
          
          return logEntry;
      }
      
      /**
       * Log a debug message
       * @param {string} message - Message to log
       * @param {object} data - Additional data to log
       * @public
       */
      debug(message, data = null) {
          return this._log('debug', message, data);
      }
      
      /**
       * Log an info message
       * @param {string} message - Message to log
       * @param {object} data - Additional data to log
       * @public
       */
      info(message, data = null) {
          return this._log('info', message, data);
      }
      
      /**
       * Log a warning message
       * @param {string} message - Message to log
       * @param {object} data - Additional data to log
       * @public
       */
      warn(message, data = null) {
          return this._log('warn', message, data);
      }
      
      /**
       * Log an error message
       * @param {string} message - Message to log
       * @param {object} data - Additional data to log
       * @public
       */
      error(message, data = null) {
          return this._log('error', message, data);
      }
      
      /**
       * Get all logs
       * @returns {Array} - Array of log entries
       * @public
       */
      getLogs() {
          return [...this.logs];
      }
      
      /**
       * Clear all logs
       * @public
       */
      clearLogs() {
          this.logs = [];
          
          if (this.logContent) {
              this.logContent.innerHTML = '';
          }
          
          if (this.enabled) {
              this.info('Logs cleared');
          }
      }
      
      /**
       * Toggle debug logging
       * @param {boolean} enabled - Whether to enable logging
       * @public
       */
      setEnabled(enabled) {
          this.enabled = enabled;
          
          if (this.logContainer) {
              this.logContainer.style.display = enabled ? 'block' : 'none';
          }
          
          if (enabled) {
              this.info('Debug logging enabled');
          }
      }
      
      /**
       * Set the log level
       * @param {string} level - Log level (debug, info, warn, error)
       * @public
       */
      setLogLevel(level) {
          if (['debug', 'info', 'warn', 'error'].includes(level)) {
              this.logLevel = level;
              
              if (this.enabled) {
                  this.info(`Log level set to ${level}`);
              }
          }
      }
      
      /**
       * Log form data
       * Utility method to log the current form data
       * @public
       */
      logFormData() {
          if (!this.enabled) return;
          
          this.info('Current form data', this.formChippy.formData);
      }
      
      /**
       * Log slide change
       * @param {number} fromIndex - Previous slide index
       * @param {number} toIndex - New slide index
       * @public
       */
      logSlideChange(fromIndex, toIndex) {
          if (!this.enabled) return;
          
          const fromSlide = this.formChippy.slides[fromIndex];
          const toSlide = this.formChippy.slides[toIndex];
          
          this.info('Slide change', {
              from: {
                  index: fromIndex,
                  id: fromSlide ? fromSlide.getAttribute('data-fc-slide') : null
              },
              to: {
                  index: toIndex,
                  id: toSlide ? toSlide.getAttribute('data-fc-slide') : null
              }
          });
      }
      
      /**
       * Log validation result
       * @param {HTMLElement} input - The input element
       * @param {boolean} isValid - Whether the input is valid
       * @param {string} errorMessage - Error message if invalid
       * @public
       */
      logValidation(input, isValid, errorMessage = null) {
          if (!this.enabled) return;
          
          // Find the slide this input belongs to
          const slide = input.closest('[data-fc-slide]');
          const slideId = slide ? slide.getAttribute('data-fc-slide') : 'unknown';
          const slideIndex = this.formChippy.slides.indexOf(slide);
          
          // Get validation rules that were applied
          const validationRules = this._getValidationRules(input);
          
          const logLevel = isValid ? 'info' : 'warn';
          const message = isValid ? 
              `✓ Validation passed: ${input.name || input.id || 'unnamed input'}` : 
              `⚠️ Validation failed: ${input.name || input.id || 'unnamed input'}`;
          
          this._log(logLevel, message, {
              slide: {
                  id: slideId,
                  index: slideIndex,
                  title: slide ? slide.querySelector('[data-fc-slide-title]')?.textContent : 'Unknown'
              },
              input: {
                  name: input.name || input.id || 'unnamed input',
                  type: input.type || input.tagName.toLowerCase(),
                  value: input.value,
                  required: input.required || false,
                  validationRules
              },
              result: {
                  isValid,
                  errorMessage,
                  timestamp: new Date().toISOString()
              },
              affectsNavigation: input.required || validationRules.length > 0
          });
          
          // Update UI if enabled
          if (this.logToUI && this.logContainer) {
              this._updateValidationUI(input, isValid, errorMessage);
          }
      }
      
      /**
       * Get validation rules that apply to an input
       * @param {HTMLElement} input - Input element
       * @returns {Array} Array of validation rule objects
       * @private
       */
      _getValidationRules(input) {
          const rules = [];
          
          if (input.required) {
              rules.push({ rule: 'required', message: 'This field is required' });
          }
          
          if (input.type === 'email') {
              rules.push({ rule: 'email', message: 'Must be a valid email address' });
          }
          
          if (input.type === 'number') {
              const min = input.getAttribute('min');
              const max = input.getAttribute('max');
              
              if (min !== null) {
                  rules.push({ rule: 'min', value: min, message: `Minimum value is ${min}` });
              }
              
              if (max !== null) {
                  rules.push({ rule: 'max', value: max, message: `Maximum value is ${max}` });
              }
          }
          
          // Pattern validation
          const pattern = input.getAttribute('pattern');
          if (pattern) {
              const errorMsg = input.getAttribute('data-error-message') || 'Please enter a valid value';
              rules.push({ rule: 'pattern', pattern, message: errorMsg });
          }
          
          // Min and max length
          const minLength = input.getAttribute('minlength');
          if (minLength !== null) {
              rules.push({ rule: 'minlength', value: minLength, message: `Minimum length is ${minLength} characters` });
          }
          
          const maxLength = input.getAttribute('maxlength');
          if (maxLength !== null) {
              rules.push({ rule: 'maxlength', value: maxLength, message: `Maximum length is ${maxLength} characters` });
          }
          
          return rules;
      }
      
      /**
       * Update the validation status in the UI
       * @param {HTMLElement} input - Input element
       * @param {boolean} isValid - Whether the input is valid
       * @param {string} errorMessage - Error message if invalid
       * @private
       */
      _updateValidationUI(input, isValid, errorMessage) {
          // Find or create validation section in debug UI
          let validationSection = this.logContainer.querySelector('.fc-debug-validation');
          
          if (!validationSection) {
              validationSection = document.createElement('div');
              validationSection.className = 'fc-debug-validation';
              validationSection.innerHTML = `
                  <div class="fc-debug-validation-header">
                      <h4>Validation Status</h4>
                      <button class="fc-debug-validation-clear">Clear</button>
                  </div>
                  <div class="fc-debug-validation-content"></div>
              `;
              
              // Add clear button functionality
              const clearBtn = validationSection.querySelector('.fc-debug-validation-clear');
              clearBtn.addEventListener('click', () => {
                  const content = validationSection.querySelector('.fc-debug-validation-content');
                  content.innerHTML = '';
              });
              
              this.logContainer.appendChild(validationSection);
          }
          
          const validationContent = validationSection.querySelector('.fc-debug-validation-content');
          
          // Create or update validation entry for this input
          const inputId = input.name || input.id || Math.random().toString(36).substr(2, 9);
          let validationEntry = validationContent.querySelector(`[data-input-id="${inputId}"]`);
          
          if (!validationEntry) {
              validationEntry = document.createElement('div');
              validationEntry.className = 'fc-debug-validation-entry';
              validationEntry.dataset.inputId = inputId;
              validationContent.appendChild(validationEntry);
          }
          
          // Update entry content
          validationEntry.className = `fc-debug-validation-entry ${isValid ? 'fc-debug-validation-valid' : 'fc-debug-validation-invalid'}`;
          validationEntry.innerHTML = `
              <div class="fc-debug-validation-input">
                  <span class="fc-debug-validation-name">${input.name || input.id || 'unnamed input'}</span>
                  <span class="fc-debug-validation-type">${input.type || input.tagName.toLowerCase()}</span>
                  <span class="fc-debug-validation-status ${isValid ? 'valid' : 'invalid'}">
                      ${isValid ? '✓' : '⚠️'}
                  </span>
              </div>
              ${!isValid ? `<div class="fc-debug-validation-error">${errorMessage}</div>` : ''}
              <div class="fc-debug-validation-value">Value: "${input.value}"</div>
          `;
      }
      
      /**
       * Log form submission
       * @param {object} formData - The form data being submitted
       * @param {string} endpoint - The submission endpoint
       * @public
       */
      logSubmission(formData, endpoint) {
          if (!this.enabled) return;
          
          this.info('Form submission', {
              endpoint,
              formData
          });
      }
  }
  
  
  /**
   * Text.js
   * Handles text, email, and number input types
   */
  
  class TextInput {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          
          // Initialize
          this._init();
      }
      
      /**
       * Initialize text input handling
       * @private
       */
      _init() {
          // Find all text inputs
          const textInputs = this.formChippy.container.querySelectorAll(
              `${this.options.inputSelector}[type="text"], 
               ${this.options.inputSelector}[type="email"], 
               ${this.options.inputSelector}[type="number"], 
               ${this.options.inputSelector}[type="tel"]`
          );
          
          // Add event listeners
          textInputs.forEach(input => {
              // Input validation
              input.addEventListener('input', () => {
                  this.formChippy.validation.clearInputError(input);
              });
              
              // Enter key handling
              input.addEventListener('keypress', (e) => {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                      
                      // Find the button in the same slide
                      const slide = input.closest(this.options.slideSelector);
                      const button = slide.querySelector(this.options.buttonSelector);
                      
                      if (button) button.click();
                  }
              });
          });
      }
      
      /**
       * Format input based on type (if needed)
       * @param {HTMLElement} input - Input element
       */
      formatInput(input) {
          // Add specialized formatting as needed
          // For example, phone number formatting, currency formatting, etc.
          
          if (input.hasAttribute('data-format')) {
              const format = input.getAttribute('data-format');
              
              switch(format) {
                  case 'phone':
                      this._formatPhone(input);
                      break;
                  case 'currency':
                      this._formatCurrency(input);
                      break;
                  // Add other formatting options as needed
              }
          }
      }
      
      /**
       * Format phone number
       * @param {HTMLElement} input - Input element
       * @private
       */
      _formatPhone(input) {
          // Simple phone formatting example
          const value = input.value.replace(/\D/g, '');
          if (value.length <= 10) {
              let formatted = '';
              
              if (value.length > 0) formatted += '(' + value.substring(0, 3);
              if (value.length > 3) formatted += ') ' + value.substring(3, 6);
              if (value.length > 6) formatted += '-' + value.substring(6, 10);
              
              input.value = formatted;
          }
      }
      
      /**
       * Format currency
       * @param {HTMLElement} input - Input element
       * @private
       */
      _formatCurrency(input) {
          // Simple currency formatting example
          const value = parseFloat(input.value.replace(/[^\d.-]/g, ''));
          if (!isNaN(value)) {
              input.value = value.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
              });
          }
      }
  }
  
  
  /**
   * Radio.js
   * Handles radio button inputs
   */
  
  class RadioInput {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          
          // Initialize
          this._init();
      }
      
      /**
       * Initialize radio input handling
       * @private
       */
      _init() {
          // Find all radio inputs
          const radioGroups = this._getRadioGroups();
          
          // Add event listeners
          radioGroups.forEach(group => {
              const radios = group.querySelectorAll(`${this.options.inputSelector}[type="radio"]`);
              
              radios.forEach(radio => {
                  // Change event for auto-advance
                  radio.addEventListener('change', () => {
                      // Clear any errors
                      this.formChippy.validation.clearInputError(radio);
                      
                      // Auto-advance if enabled
                      if (radio.hasAttribute('data-fc-auto-advance') || 
                          group.hasAttribute('data-fc-auto-advance')) {
                          
                          // Find the slide containing this radio
                          const slide = radio.closest(this.options.slideSelector);
                          const slideIndex = this.formChippy.slides.indexOf(slide);
                          
                          // Go to next slide if not the last slide
                          if (slideIndex < this.formChippy.totalSlides - 1) {
                              // Short delay to show selection before advancing
                              setTimeout(() => {
                                  this.formChippy.goToSlide(slideIndex + 1);
                              }, 300);
                          }
                      }
                  });
                  
                  // Keyboard handling for better accessibility
                  radio.addEventListener('keydown', (e) => {
                      // Allow space to select
                      if (e.key === ' ') {
                          e.preventDefault();
                          radio.checked = true;
                          radio.dispatchEvent(new Event('change'));
                      }
                  });
              });
          });
      }
      
      /**
       * Get all radio groups in the form
       * @returns {Array} Array of radio group containers
       * @private
       */
      _getRadioGroups() {
          const groups = [];
          const radios = this.formChippy.container.querySelectorAll(
              `${this.options.inputSelector}[type="radio"]`
          );
          
          // Group radios by name attribute
          const nameGroups = {};
          
          radios.forEach(radio => {
              const name = radio.getAttribute('name');
              if (!name) return;
              
              if (!nameGroups[name]) {
                  nameGroups[name] = [];
              }
              
              nameGroups[name].push(radio);
          });
          
          // Find common parent for each group
          Object.values(nameGroups).forEach(groupRadios => {
              if (groupRadios.length > 0) {
                  // Try to find a container with 'data-fc-radio-group'
                  let container = groupRadios[0].closest('[data-fc-radio-group]');
                  
                  // If not found, use the closest common parent
                  if (!container) {
                      // Find closest parent that contains all radios
                      const parents = [];
                      let parent = groupRadios[0].parentElement;
                      
                      while (parent) {
                          if (parent.contains(groupRadios[0])) {
                              parents.push(parent);
                          }
                          parent = parent.parentElement;
                      }
                      
                      // Find the first parent that contains all radios
                      container = parents.find(p => 
                          groupRadios.every(r => p.contains(r))
                      );
                  }
                  
                  if (container) {
                      groups.push(container);
                  }
              }
          });
          
          return groups;
      }
      
      /**
       * Style radio buttons with custom appearance
       * @param {HTMLElement} container - Radio group container
       */
      styleRadioGroup(container) {
          // Apply custom styling if needed
          if (container.hasAttribute('data-fc-style') && 
              !container.classList.contains('fc-styled')) {
              
              const style = container.getAttribute('data-fc-style');
              const radios = container.querySelectorAll(`${this.options.inputSelector}[type="radio"]`);
              
              // Apply different styles based on style attribute
              switch (style) {
                  case 'cards':
                      this._applyCardStyle(container, radios);
                      break;
                  case 'buttons':
                      this._applyButtonStyle(container, radios);
                      break;
                  case 'toggle':
                      this._applyToggleStyle(container, radios);
                      break;
              }
              
              // Mark as styled
              container.classList.add('fc-styled');
          }
      }
      
      /**
       * Apply card style to radio buttons
       * @param {HTMLElement} container - Radio group container
       * @param {NodeList} radios - Radio inputs
       * @private
       */
      _applyCardStyle(container, radios) {
          radios.forEach(radio => {
              const label = radio.closest('label') || 
                            container.querySelector(`label[for="${radio.id}"]`);
              
              if (label) {
                  label.classList.add('fc-radio-card');
                  
                  // Hide the original radio
                  radio.style.position = 'absolute';
                  radio.style.opacity = '0';
                  
                  // Create custom radio appearance
                  const customRadio = document.createElement('span');
                  customRadio.className = 'fc-custom-radio-card';
                  label.appendChild(customRadio);
              }
          });
      }
      
      /**
       * Apply button style to radio buttons
       * @param {HTMLElement} container - Radio group container
       * @param {NodeList} radios - Radio inputs
       * @private
       */
      _applyButtonStyle(container, radios) {
          // Create a button container
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'fc-radio-buttons';
          container.appendChild(buttonContainer);
          
          radios.forEach(radio => {
              const button = document.createElement('button');
              button.type = 'button';
              button.className = 'fc-radio-button';
              button.textContent = radio.getAttribute('data-label') || radio.value;
              button.setAttribute('data-value', radio.value);
              
              // Mark as selected if radio is checked
              if (radio.checked) {
                  button.classList.add('selected');
              }
              
              // Button click handler
              button.addEventListener('click', () => {
                  radio.checked = true;
                  radio.dispatchEvent(new Event('change'));
                  
                  // Update button styles
                  Array.from(buttonContainer.children).forEach(btn => {
                      btn.classList.remove('selected');
                  });
                  button.classList.add('selected');
              });
              
              buttonContainer.appendChild(button);
          });
          
          // Hide original radios
          radios.forEach(radio => {
              radio.style.display = 'none';
          });
      }
      
      /**
       * Apply toggle style to radio buttons
       * @param {HTMLElement} container - Radio group container
       * @param {NodeList} radios - Radio inputs
       * @private
       */
      _applyToggleStyle(container, radios) {
          // Only works with 2 options
          if (radios.length !== 2) return;
          
          // Create toggle container
          const toggleContainer = document.createElement('div');
          toggleContainer.className = 'fc-toggle';
          container.appendChild(toggleContainer);
          
          // Create toggle handle
          const handle = document.createElement('span');
          handle.className = 'fc-toggle-handle';
          toggleContainer.appendChild(handle);
          
          // Create labels
          radios.forEach((radio, index) => {
              const label = document.createElement('span');
              label.className = 'fc-toggle-label';
              label.textContent = radio.getAttribute('data-label') || radio.value;
              label.setAttribute('data-value', radio.value);
              
              // Mark as selected if radio is checked
              if (radio.checked) {
                  label.classList.add('selected');
                  handle.style.transform = `translateX(${index * 100}%)`;
              }
              
              // Label click handler
              label.addEventListener('click', () => {
                  radio.checked = true;
                  radio.dispatchEvent(new Event('change'));
                  
                  // Update toggle styles
                  Array.from(toggleContainer.querySelectorAll('.fc-toggle-label')).forEach(lbl => {
                      lbl.classList.remove('selected');
                  });
                  label.classList.add('selected');
                  
                  // Move handle
                  handle.style.transform = `translateX(${index * 100}%)`;
              });
              
              toggleContainer.appendChild(label);
          });
          
          // Hide original radios
          radios.forEach(radio => {
              radio.style.display = 'none';
          });
      }
  }
  
  
  /**
   * Toggle.js
   * Handles toggle/checkbox inputs
   */
  
  class ToggleInput {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          
          // Initialize
          this._init();
      }
      
      /**
       * Initialize toggle input handling
       * @private
       */
      _init() {
          // Find all checkbox inputs
          const checkboxes = this.formChippy.container.querySelectorAll(
              `${this.options.inputSelector}[type="checkbox"]`
          );
          
          // Add event listeners
          checkboxes.forEach(checkbox => {
              // Change event
              checkbox.addEventListener('change', () => {
                  // Clear any errors
                  this.formChippy.validation.clearInputError(checkbox);
                  
                  // Auto-advance if enabled
                  if (checkbox.hasAttribute('data-fc-auto-advance')) {
                      // Find the slide containing this checkbox
                      const slide = checkbox.closest(this.options.slideSelector);
                      const slideIndex = this.formChippy.slides.indexOf(slide);
                      
                      // Go to next slide if not the last slide
                      if (slideIndex < this.formChippy.totalSlides - 1) {
                          // Short delay to show selection before advancing
                          setTimeout(() => {
                              this.formChippy.goToSlide(slideIndex + 1);
                          }, 300);
                      }
                  }
              });
              
              // Style toggle if needed
              if (checkbox.hasAttribute('data-fc-toggle-style')) {
                  this._styleToggle(checkbox);
              }
          });
      }
      
      /**
       * Style checkbox as a toggle switch
       * @param {HTMLElement} checkbox - Checkbox input
       * @private
       */
      _styleToggle(checkbox) {
          // Skip if already styled
          if (checkbox.closest('.fc-toggle-switch')) return;
          
          // Get parent label or create one
          let label = checkbox.closest('label');
          
          if (!label) {
              // Find label by for attribute
              if (checkbox.id) {
                  label = this.formChippy.container.querySelector(`label[for="${checkbox.id}"]`);
              }
              
              // Create label if not found
              if (!label) {
                  label = document.createElement('label');
                  checkbox.parentNode.insertBefore(label, checkbox);
                  label.appendChild(checkbox);
              }
          }
          
          // Style the label as a toggle switch
          label.classList.add('fc-toggle-switch');
          
          // Create toggle parts
          const toggle = document.createElement('span');
          toggle.className = 'fc-toggle-track';
          
          const handle = document.createElement('span');
          handle.className = 'fc-toggle-handle';
          
          // Get label text (if any)
          let labelText = '';
          Array.from(label.childNodes).forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
                  labelText += node.nodeValue.trim() + ' ';
              }
          });
          
          // Clear label and rebuild with toggle structure
          label.innerHTML = '';
          
          // Add checkbox back
          label.appendChild(checkbox);
          
          // Add toggle elements
          toggle.appendChild(handle);
          label.appendChild(toggle);
          
          // Add label text back if it existed
          if (labelText) {
              const textSpan = document.createElement('span');
              textSpan.className = 'fc-toggle-label-text';
              textSpan.textContent = labelText.trim();
              label.appendChild(textSpan);
          }
          
          // Add optional ON/OFF text
          if (checkbox.hasAttribute('data-fc-toggle-text')) {
              const onOffContainer = document.createElement('span');
              onOffContainer.className = 'fc-toggle-text';
              
              const onText = document.createElement('span');
              onText.className = 'fc-toggle-on';
              onText.textContent = checkbox.getAttribute('data-fc-toggle-on') || 'ON';
              
              const offText = document.createElement('span');
              offText.className = 'fc-toggle-off';
              offText.textContent = checkbox.getAttribute('data-fc-toggle-off') || 'OFF';
              
              onOffContainer.appendChild(onText);
              onOffContainer.appendChild(offText);
              toggle.appendChild(onOffContainer);
          }
          
          // Initial state
          this._updateToggleState(checkbox);
          
          // Update toggle state on change
          checkbox.addEventListener('change', () => {
              this._updateToggleState(checkbox);
          });
      }
      
      /**
       * Update toggle switch appearance based on checkbox state
       * @param {HTMLElement} checkbox - Checkbox input
       * @private
       */
      _updateToggleState(checkbox) {
          const label = checkbox.closest('.fc-toggle-switch');
          
          if (checkbox.checked) {
              label.classList.add('fc-checked');
          } else {
              label.classList.remove('fc-checked');
          }
      }
      
      /**
       * Create a group of checkboxes styled as option cards
       * @param {HTMLElement} container - Container element
       * @param {Array} options - Array of option objects {value, label, checked}
       */
      createOptionCards(container, options) {
          // Create card container
          const cardContainer = document.createElement('div');
          cardContainer.className = 'fc-option-cards';
          
          // Create cards for each option
          options.forEach(option => {
              const card = document.createElement('label');
              card.className = 'fc-option-card';
              
              // Create checkbox
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.value = option.value;
              checkbox.className = 'fc-option-checkbox';
              if (option.name) checkbox.name = option.name;
              if (option.checked) checkbox.checked = true;
              
              // Add data-fc-input for form detection
              checkbox.setAttribute('data-fc-input', '');
              
              // Create card content
              const content = document.createElement('div');
              content.className = 'fc-card-content';
              
              // Add card label
              const label = document.createElement('span');
              label.className = 'fc-card-label';
              label.textContent = option.label;
              
              // Add card icon if provided
              if (option.icon) {
                  const icon = document.createElement('span');
                  icon.className = 'fc-card-icon';
                  icon.innerHTML = option.icon;
                  content.appendChild(icon);
              }
              
              content.appendChild(label);
              
              // Add checkbox marker
              const marker = document.createElement('span');
              marker.className = 'fc-card-marker';
              
              // Assemble card
              card.appendChild(checkbox);
              card.appendChild(content);
              card.appendChild(marker);
              
              // Add to container
              cardContainer.appendChild(card);
              
              // Initialize state
              if (option.checked) {
                  card.classList.add('fc-selected');
              }
              
              // Update state on change
              checkbox.addEventListener('change', () => {
                  if (checkbox.checked) {
                      card.classList.add('fc-selected');
                  } else {
                      card.classList.remove('fc-selected');
                  }
              });
          });
          
          // Add to container
          container.appendChild(cardContainer);
      }
  }
  
  
  /**
   * File.js
   * Handles file upload inputs
   */
  
  class FileInput {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          this.files = new Map(); // Store files by input id
          
          // Initialize
          this._init();
      }
      
      /**
       * Initialize file input handling
       * @private
       */
      _init() {
          // Find all file inputs
          const fileInputs = this.formChippy.container.querySelectorAll(
              `${this.options.inputSelector}[type="file"], input[type="file"][data-fc-file]`
          );
          
          // Add event listeners to each file input
          fileInputs.forEach(fileInput => {
              // Initialize file storage for this input
              this.files.set(fileInput.id || fileInput.name, new Map());
              
              // Style the file input
              this._styleFileInput(fileInput);
              
              // Handle change event
              fileInput.addEventListener('change', (e) => {
                  this._handleFileSelection(fileInput, e);
              });
              
              // Handle drag and drop events if the input has data-fc-dropzone
              if (fileInput.hasAttribute('data-fc-dropzone')) {
                  this._setupDropZone(fileInput);
              }
          });
      }
      
      /**
       * Style a file input with custom UI
       * @param {HTMLInputElement} fileInput - The file input element
       * @private
       */
      _styleFileInput(fileInput) {
          // Skip if already styled
          if (fileInput.closest('.fc-file-upload')) return;
          
          // Get file input configuration
          const multiple = fileInput.hasAttribute('multiple');
          const accept = fileInput.getAttribute('accept') || '';
          const maxSize = fileInput.getAttribute('data-fc-max-size') || '10'; // Default 10MB
          const maxFiles = fileInput.getAttribute('data-fc-max-files') || '5'; // Default 5 files
          const dropzone = fileInput.hasAttribute('data-fc-dropzone');
          const preview = fileInput.hasAttribute('data-fc-preview');
          
          // Create wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'fc-file-upload';
          if (dropzone) wrapper.classList.add('fc-dropzone');
          
          // Insert wrapper before file input
          fileInput.parentNode.insertBefore(wrapper, fileInput);
          
          // Create label and move file input inside
          const label = document.createElement('label');
          label.className = 'fc-file-label';
          label.setAttribute('for', fileInput.id || '');
          wrapper.appendChild(label);
          label.appendChild(fileInput);
          
          // Create button
          const button = document.createElement('span');
          button.className = 'fc-file-button';
          button.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"></path></svg>';
          button.innerHTML += '<span>Choose file' + (multiple ? 's' : '') + '</span>';
          label.appendChild(button);
          
          // Create file info area
          const infoArea = document.createElement('div');
          infoArea.className = 'fc-file-info';
          infoArea.textContent = multiple 
              ? 'No files chosen' 
              : 'No file chosen';
          wrapper.appendChild(infoArea);
          
          // Create help text with file type and size restrictions
          const helpText = document.createElement('div');
          helpText.className = 'fc-file-help';
          
          // Create file type text
          if (accept) {
              const acceptText = this._formatAcceptText(accept);
              const fileTypeText = document.createElement('div');
              fileTypeText.className = 'fc-file-type-text';
              fileTypeText.textContent = `Accepted file types: ${acceptText}`;
              helpText.appendChild(fileTypeText);
          }
          
          // Create max size text
          const maxSizeText = document.createElement('div');
          maxSizeText.className = 'fc-file-size-text';
          maxSizeText.textContent = `Maximum file size: ${maxSize}MB`;
          helpText.appendChild(maxSizeText);
          
          // Create max files text for multiple files
          if (multiple) {
              const maxFilesText = document.createElement('div');
              maxFilesText.className = 'fc-file-count-text';
              maxFilesText.textContent = `Maximum number of files: ${maxFiles}`;
              helpText.appendChild(maxFilesText);
          }
          
          wrapper.appendChild(helpText);
          
          // Create file preview container if preview is enabled
          if (preview) {
              const previewContainer = document.createElement('div');
              previewContainer.className = 'fc-file-preview-container';
              wrapper.appendChild(previewContainer);
          }
          
          // Create error container
          const errorContainer = document.createElement('div');
          errorContainer.className = 'fc-file-error';
          wrapper.appendChild(errorContainer);
      }
      
      /**
       * Format the accept attribute to human-readable text
       * @param {string} accept - The accept attribute value
       * @returns {string} - Formatted file types
       * @private
       */
      _formatAcceptText(accept) {
          if (!accept) return 'All files';
          
          const types = accept.split(',').map(type => {
              type = type.trim();
              
              // Handle image/*, video/*, etc.
              if (type.endsWith('/*')) {
                  return type.replace('/*', ' files');
              }
              
              // Handle extensions like .jpg, .pdf
              if (type.startsWith('.')) {
                  return type.toUpperCase();
              }
              
              // Handle specific mime types
              const mimeMap = {
                  'image/jpeg': 'JPEG images',
                  'image/png': 'PNG images',
                  'image/gif': 'GIF images',
                  'image/svg+xml': 'SVG images',
                  'application/pdf': 'PDF documents',
                  'application/msword': 'Word documents',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word documents',
                  'application/vnd.ms-excel': 'Excel spreadsheets',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheets',
                  'text/plain': 'Text files',
                  'text/csv': 'CSV files'
              };
              
              return mimeMap[type] || type;
          });
          
          return types.join(', ');
      }
      
      /**
       * Handle file selection from the input
       * @param {HTMLInputElement} fileInput - The file input element
       * @param {Event} event - The change event
       * @private
       */
      _handleFileSelection(fileInput, event) {
          const files = event.target.files;
          const multiple = fileInput.hasAttribute('multiple');
          const maxSize = parseInt(fileInput.getAttribute('data-fc-max-size') || '10', 10) * 1024 * 1024; // Convert to bytes
          const maxFiles = parseInt(fileInput.getAttribute('data-fc-max-files') || '5', 10);
          const accept = fileInput.getAttribute('accept') || '';
          
          // Get UI elements
          const wrapper = fileInput.closest('.fc-file-upload');
          const infoArea = wrapper.querySelector('.fc-file-info');
          const errorContainer = wrapper.querySelector('.fc-file-error');
          const previewContainer = wrapper.querySelector('.fc-file-preview-container');
          
          // Clear previous errors
          this.formChippy.validation.clearInputError(fileInput);
          errorContainer.textContent = '';
          
          // Validate files
          let errorMessage = '';
          let validFiles = [];
          
          // Check max files
          if (multiple && files.length > maxFiles) {
              errorMessage = `Too many files. Maximum ${maxFiles} files allowed.`;
          }
          
          // Check each file
          if (!errorMessage) {
              for (let i = 0; i < files.length; i++) {
                  const file = files[i];
                  
                  // Check file size
                  if (file.size > maxSize) {
                      errorMessage = `File "${file.name}" exceeds the maximum size of ${maxSize / (1024 * 1024)}MB.`;
                      break;
                  }
                  
                  // Check file type if accept is specified
                  if (accept && !this._isFileTypeAccepted(file, accept)) {
                      errorMessage = `File "${file.name}" is not an accepted file type.`;
                      break;
                  }
                  
                  validFiles.push(file);
              }
          }
          
          // Display error if any
          if (errorMessage) {
              this.formChippy.validation.showInputError(fileInput, errorMessage);
              errorContainer.textContent = errorMessage;
              return;
          }
          
          // Store valid files
          const fileMap = this.files.get(fileInput.id || fileInput.name);
          fileMap.clear(); // Clear previous files if not multiple
          
          validFiles.forEach(file => {
              fileMap.set(file.name, file);
          });
          
          // Update info area
          if (validFiles.length === 0) {
              infoArea.textContent = multiple ? 'No files chosen' : 'No file chosen';
          } else if (validFiles.length === 1) {
              infoArea.textContent = validFiles[0].name;
          } else {
              infoArea.textContent = `${validFiles.length} files selected`;
          }
          
          // Update preview if enabled
          if (previewContainer) {
              this._updateFilePreviews(previewContainer, validFiles, fileInput);
          }
      }
      
      /**
       * Check if a file type is accepted
       * @param {File} file - The file to check
       * @param {string} accept - The accept attribute value
       * @returns {boolean} - Whether the file type is accepted
       * @private
       */
      _isFileTypeAccepted(file, accept) {
          if (!accept) return true;
          
          const acceptedTypes = accept.split(',').map(type => type.trim());
          const fileType = file.type;
          const fileName = file.name;
          const fileExtension = '.' + fileName.split('.').pop().toLowerCase();
          
          return acceptedTypes.some(type => {
              // Check exact mime type match
              if (type === fileType) return true;
              
              // Check file extension
              if (type.startsWith('.') && fileExtension === type.toLowerCase()) return true;
              
              // Check wildcard mime type (e.g., image/*)
              if (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '/'))) return true;
              
              return false;
          });
      }
      
      /**
       * Update file previews in the preview container
       * @param {HTMLElement} previewContainer - The preview container element
       * @param {File[]} files - Array of files to preview
       * @param {HTMLInputElement} fileInput - The file input element
       * @private
       */
      _updateFilePreviews(previewContainer, files, fileInput) {
          // Clear previous previews
          previewContainer.innerHTML = '';
          
          // Create previews for each file
          files.forEach(file => {
              const preview = document.createElement('div');
              preview.className = 'fc-file-preview';
              
              // Create preview content based on file type
              if (file.type.startsWith('image/')) {
                  // Image preview
                  const img = document.createElement('img');
                  img.className = 'fc-file-image-preview';
                  img.file = file;
                  preview.appendChild(img);
                  
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      img.src = e.target.result;
                  };
                  reader.readAsDataURL(file);
              } else {
                  // Generic file icon preview
                  const icon = document.createElement('div');
                  icon.className = 'fc-file-icon-preview';
                  
                  // Set icon based on file type
                  if (file.type.startsWith('application/pdf')) {
                      icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5h2c.83 0 1.5.67 1.5 1.5v3zm4-3.75c0 .41-.34.75-.75.75H19v1h.75c.41 0 .75.34.75.75s-.34.75-.75.75H19v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1h1.25c.41 0 .75.34.75.75zM9 9.5h1v-1H9v1zM3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1zm11 5.5h1v-3h-1v3z" fill="currentColor"></path></svg>';
                  } else if (file.type.startsWith('video/')) {
                      icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" fill="currentColor"></path></svg>';
                  } else if (file.type.startsWith('audio/')) {
                      icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" fill="currentColor"></path></svg>';
                  } else {
                      icon.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"></path></svg>';
                  }
                  
                  preview.appendChild(icon);
              }
              
              // Create file name
              const name = document.createElement('div');
              name.className = 'fc-file-preview-name';
              name.textContent = file.name;
              preview.appendChild(name);
              
              // Create remove button
              const removeBtn = document.createElement('button');
              removeBtn.className = 'fc-file-remove';
              removeBtn.innerHTML = '&times;';
              removeBtn.type = 'button';
              removeBtn.setAttribute('aria-label', 'Remove file');
              
              // Handle remove button click
              removeBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Remove file from storage
                  const fileMap = this.files.get(fileInput.id || fileInput.name);
                  fileMap.delete(file.name);
                  
                  // Remove preview
                  preview.remove();
                  
                  // Update info area
                  const infoArea = fileInput.closest('.fc-file-upload').querySelector('.fc-file-info');
                  const remainingFiles = fileMap.size;
                  
                  if (remainingFiles === 0) {
                      infoArea.textContent = fileInput.hasAttribute('multiple') ? 'No files chosen' : 'No file chosen';
                  } else if (remainingFiles === 1) {
                      infoArea.textContent = Array.from(fileMap.values())[0].name;
                  } else {
                      infoArea.textContent = `${remainingFiles} files selected`;
                  }
                  
                  // Clear the file input
                  fileInput.value = '';
              });
              
              preview.appendChild(removeBtn);
              previewContainer.appendChild(preview);
          });
      }
      
      /**
       * Set up drag and drop functionality for a file input
       * @param {HTMLInputElement} fileInput - The file input element
       * @private
       */
      _setupDropZone(fileInput) {
          const dropZone = fileInput.closest('.fc-dropzone');
          if (!dropZone) return;
          
          // Add instructional text
          const dropText = document.createElement('div');
          dropText.className = 'fc-drop-text';
          dropText.innerHTML = 'Drop files here or <span>browse</span>';
          
          // Add to the button area
          const button = dropZone.querySelector('.fc-file-button');
          if (button) {
              button.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"></path></svg>';
              button.appendChild(dropText);
          }
          
          // Handle drag events
          dropZone.addEventListener('dragover', (e) => {
              e.preventDefault();
              e.stopPropagation();
              dropZone.classList.add('fc-dragover');
          });
          
          dropZone.addEventListener('dragleave', (e) => {
              e.preventDefault();
              e.stopPropagation();
              dropZone.classList.remove('fc-dragover');
          });
          
          dropZone.addEventListener('drop', (e) => {
              e.preventDefault();
              e.stopPropagation();
              dropZone.classList.remove('fc-dragover');
              
              // Handle the dropped files
              if (e.dataTransfer.files.length) {
                  // Set the files to the input and trigger change event
                  fileInput.files = e.dataTransfer.files;
                  fileInput.dispatchEvent(new Event('change'));
              }
          });
      }
      
      /**
       * Get all files for a specific file input
       * @param {string} inputId - The id or name of the file input
       * @returns {File[]} Array of files
       */
      getFiles(inputId) {
          const fileMap = this.files.get(inputId);
          return fileMap ? Array.from(fileMap.values()) : [];
      }
      
      /**
       * Create a new file upload input
       * @param {HTMLElement} container - The container to append the file input to
       * @param {object} config - Configuration options
       * @returns {HTMLInputElement} The created file input
       */
      createFileInput(container, config) {
          const {
              name,
              id = name,
              multiple = false,
              accept = '',
              maxSize = 10, // MB
              maxFiles = 5,
              required = false,
              dropzone = true,
              preview = true,
              label = 'Upload Files',
          } = config;
          
          // Create wrapper element
          const wrapper = document.createElement('div');
          wrapper.className = 'fc-form-group';
          
          // Create label element if provided
          if (label) {
              const labelEl = document.createElement('label');
              labelEl.setAttribute('for', id);
              labelEl.textContent = label;
              wrapper.appendChild(labelEl);
          }
          
          // Create file input
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.id = id;
          fileInput.name = name;
          fileInput.setAttribute('data-fc-input', '');
          fileInput.setAttribute('data-fc-file', '');
          
          // Set attributes based on config
          if (multiple) fileInput.setAttribute('multiple', '');
          if (accept) fileInput.setAttribute('accept', accept);
          if (maxSize) fileInput.setAttribute('data-fc-max-size', maxSize.toString());
          if (maxFiles) fileInput.setAttribute('data-fc-max-files', maxFiles.toString());
          if (required) {
              fileInput.setAttribute('required', '');
              fileInput.setAttribute('data-fc-required', '');
          }
          if (dropzone) fileInput.setAttribute('data-fc-dropzone', '');
          if (preview) fileInput.setAttribute('data-fc-preview', '');
          
          // Add to wrapper
          wrapper.appendChild(fileInput);
          
          // Add to container
          container.appendChild(wrapper);
          
          // Style the file input
          this._styleFileInput(fileInput);
          
          // Initialize file storage for this input
          this.files.set(id || name, new Map());
          
          // Set up event listeners
          fileInput.addEventListener('change', (e) => {
              this._handleFileSelection(fileInput, e);
          });
          
          // Set up dropzone if enabled
          if (dropzone) {
              this._setupDropZone(fileInput);
          }
          
          return fileInput;
      }
  }
  
  
  /**
   * Textarea.js
   * Handles textarea inputs with auto-resize and character counting
   */
  
  class TextareaInput {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          
          // Initialize
          this._init();
      }
      
      /**
       * Initialize textarea input handling
       * @private
       */
      _init() {
          // Find all textarea inputs
          const textareas = this.formChippy.container.querySelectorAll(
              `${this.options.inputSelector}[data-fc-textarea], textarea${this.options.inputSelector}`
          );
          
          // Add event listeners to each textarea
          textareas.forEach(textarea => {
              // Enable auto-resize if specified
              if (textarea.hasAttribute('data-fc-auto-resize')) {
                  this._setupAutoResize(textarea);
              }
              
              // Set up character counter if specified
              if (textarea.hasAttribute('data-fc-char-count') || textarea.hasAttribute('maxlength')) {
                  this._setupCharacterCounter(textarea);
              }
              
              // Handle input events
              textarea.addEventListener('input', () => {
                  // Clear any errors on input
                  this.formChippy.validation.clearInputError(textarea);
              });
              
              // Handle blur events for validation
              textarea.addEventListener('blur', () => {
                  if (textarea.hasAttribute('data-fc-required') || textarea.hasAttribute('required')) {
                      if (!textarea.value.trim()) {
                          this.formChippy.validation.showInputError(textarea, 'This field is required');
                      }
                  }
                  
                  // Check pattern if specified
                  if (textarea.hasAttribute('data-fc-pattern')) {
                      const pattern = new RegExp(textarea.getAttribute('data-fc-pattern'));
                      if (textarea.value && !pattern.test(textarea.value)) {
                          const errorMessage = textarea.getAttribute('data-fc-pattern-message') || 'Please match the requested format';
                          this.formChippy.validation.showInputError(textarea, errorMessage);
                      }
                  }
                  
                  // Check min/max length
                  if (textarea.hasAttribute('minlength') && textarea.value) {
                      const minLength = parseInt(textarea.getAttribute('minlength'), 10);
                      if (textarea.value.length < minLength) {
                          this.formChippy.validation.showInputError(textarea, `Please lengthen this text to ${minLength} characters or more`);
                      }
                  }
              });
          });
      }
      
      /**
       * Set up auto-resize functionality for a textarea
       * @param {HTMLTextAreaElement} textarea - The textarea element
       * @private
       */
      _setupAutoResize(textarea) {
          // Create a hidden div to measure the height
          const heightDiv = document.createElement('div');
          heightDiv.className = 'fc-textarea-height-measure';
          heightDiv.style.position = 'absolute';
          heightDiv.style.visibility = 'hidden';
          heightDiv.style.height = 'auto';
          heightDiv.style.width = textarea.offsetWidth + 'px';
          heightDiv.style.fontFamily = getComputedStyle(textarea).fontFamily;
          heightDiv.style.fontSize = getComputedStyle(textarea).fontSize;
          heightDiv.style.lineHeight = getComputedStyle(textarea).lineHeight;
          heightDiv.style.padding = getComputedStyle(textarea).padding;
          heightDiv.style.border = getComputedStyle(textarea).border;
          heightDiv.style.wordWrap = 'break-word';
          
          // Add the height div to the DOM
          document.body.appendChild(heightDiv);
          
          // Define the resize function
          const resizeTextarea = () => {
              // Copy content and replace new lines with <br>
              heightDiv.innerHTML = textarea.value.replace(/\n/g, '<br>') + '<br>'; // Extra line for padding
              
              // Get the computed height and set it to the textarea
              const newHeight = heightDiv.offsetHeight;
              
              // Check if a min-height is specified
              const minHeight = textarea.getAttribute('data-fc-min-height');
              const maxHeight = textarea.getAttribute('data-fc-max-height');
              
              let finalHeight = newHeight;
              if (minHeight && newHeight < parseInt(minHeight, 10)) {
                  finalHeight = parseInt(minHeight, 10);
              }
              if (maxHeight && newHeight > parseInt(maxHeight, 10)) {
                  finalHeight = parseInt(maxHeight, 10);
                  textarea.style.overflowY = 'auto';
              } else {
                  textarea.style.overflowY = 'hidden';
              }
              
              textarea.style.height = 'auto';
              textarea.style.height = finalHeight + 'px';
          };
          
          // Initial resize
          resizeTextarea();
          
          // Resize on input
          textarea.addEventListener('input', resizeTextarea);
          
          // Resize on window resize
          window.addEventListener('resize', () => {
              heightDiv.style.width = textarea.offsetWidth + 'px';
              resizeTextarea();
          });
          
          // Clean up on destroy
          this.formChippy.on('destroy', () => {
              document.body.removeChild(heightDiv);
          });
      }
      
      /**
       * Set up character counter for a textarea
       * @param {HTMLTextAreaElement} textarea - The textarea element
       * @private
       */
      _setupCharacterCounter(textarea) {
          // Get the maximum length if specified
          const maxLength = textarea.getAttribute('maxlength') || 
                            textarea.getAttribute('data-fc-max-length');
          
          // Create the counter element
          const counter = document.createElement('div');
          counter.className = 'fc-char-counter';
          
          // Determine the appropriate message based on whether maxlength is set
          if (maxLength) {
              counter.textContent = `0 / ${maxLength}`;
          } else {
              counter.textContent = '0 characters';
          }
          
          // Insert the counter after the textarea
          textarea.parentNode.insertBefore(counter, textarea.nextSibling);
          
          // Update the counter on input
          const updateCounter = () => {
              const length = textarea.value.length;
              
              if (maxLength) {
                  counter.textContent = `${length} / ${maxLength}`;
                  
                  // Add warning class when approaching the limit
                  if (length >= parseInt(maxLength, 10) * 0.9) {
                      counter.classList.add('fc-char-counter-warning');
                  } else {
                      counter.classList.remove('fc-char-counter-warning');
                  }
              } else {
                  counter.textContent = `${length} characters`;
              }
          };
          
          // Initial update
          updateCounter();
          
          // Update on input
          textarea.addEventListener('input', updateCounter);
      }
      
      /**
       * Create a new textarea input
       * @param {HTMLElement} container - The container to append the textarea to
       * @param {object} config - Configuration options
       * @returns {HTMLTextAreaElement} The created textarea
       */
      createTextarea(container, config) {
          const {
              name,
              id = name,
              placeholder = '',
              value = '',
              rows = 4,
              required = false,
              maxLength,
              minLength,
              autoResize = true,
              charCount = true,
              label = '',
              pattern,
              patternMessage,
              minHeight,
              maxHeight
          } = config;
          
          // Create form group wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'fc-form-group';
          
          // Add label if provided
          if (label) {
              const labelEl = document.createElement('label');
              labelEl.setAttribute('for', id);
              labelEl.textContent = label;
              wrapper.appendChild(labelEl);
          }
          
          // Create textarea
          const textarea = document.createElement('textarea');
          textarea.id = id;
          textarea.name = name;
          textarea.rows = rows;
          textarea.setAttribute('data-fc-input', '');
          textarea.setAttribute('data-fc-textarea', '');
          
          // Set additional attributes
          if (placeholder) textarea.placeholder = placeholder;
          if (value) textarea.value = value;
          if (required) {
              textarea.required = true;
              textarea.setAttribute('data-fc-required', '');
          }
          if (maxLength) textarea.setAttribute('maxlength', maxLength);
          if (minLength) textarea.setAttribute('minlength', minLength);
          if (autoResize) textarea.setAttribute('data-fc-auto-resize', '');
          if (charCount) textarea.setAttribute('data-fc-char-count', '');
          if (pattern) {
              textarea.setAttribute('data-fc-pattern', pattern);
              if (patternMessage) textarea.setAttribute('data-fc-pattern-message', patternMessage);
          }
          if (minHeight) textarea.setAttribute('data-fc-min-height', minHeight);
          if (maxHeight) textarea.setAttribute('data-fc-max-height', maxHeight);
          
          // Add textarea to wrapper
          wrapper.appendChild(textarea);
          
          // Add wrapper to container
          container.appendChild(wrapper);
          
          // Set up auto-resize if enabled
          if (autoResize) {
              this._setupAutoResize(textarea);
          }
          
          // Set up character counter if enabled
          if (charCount || maxLength) {
              this._setupCharacterCounter(textarea);
          }
          
          return textarea;
      }
  }
  
  
  /**
   * Date.js
   * Handles date, time, and datetime inputs with enhanced UI
   */
  
  class DateInput {
      constructor(formChippy) {
          this.formChippy = formChippy;
          this.options = formChippy.options;
          
          // Initialize
          this._init();
      }
      
      /**
       * Initialize date input handling
       * @private
       */
      _init() {
          // Find all date inputs
          const dateInputs = this.formChippy.container.querySelectorAll(
              `${this.options.inputSelector}[type="date"], 
               ${this.options.inputSelector}[type="time"], 
               ${this.options.inputSelector}[type="datetime-local"],
               ${this.options.inputSelector}[data-fc-date]`
          );
          
          // Add event listeners to each date input
          dateInputs.forEach(dateInput => {
              // If enhanced UI is requested, apply it
              if (dateInput.hasAttribute('data-fc-enhanced')) {
                  this._enhanceDateInput(dateInput);
              }
              
              // Handle change event
              dateInput.addEventListener('change', () => {
                  // Clear any errors on change
                  this.formChippy.validation.clearInputError(dateInput);
                  
                  // Auto-advance if enabled
                  if (dateInput.hasAttribute('data-fc-auto-advance')) {
                      // Find the slide containing this input
                      const slide = dateInput.closest(this.options.slideSelector);
                      const slideIndex = this.formChippy.slides.indexOf(slide);
                      
                      // Go to next slide if not the last slide
                      if (slideIndex < this.formChippy.totalSlides - 1) {
                          // Short delay to show selection before advancing
                          setTimeout(() => {
                              this.formChippy.goToSlide(slideIndex + 1);
                          }, 300);
                      }
                  }
              });
              
              // Handle validation
              dateInput.addEventListener('blur', () => {
                  // Validate if required
                  if ((dateInput.hasAttribute('required') || dateInput.hasAttribute('data-fc-required')) && !dateInput.value) {
                      this.formChippy.validation.showInputError(dateInput, 'This field is required');
                  }
                  
                  // Validate min/max dates
                  if (dateInput.value) {
                      const inputValue = new Date(dateInput.value);
                      
                      // Check min date
                      if (dateInput.hasAttribute('min')) {
                          const minDate = new Date(dateInput.getAttribute('min'));
                          if (inputValue < minDate) {
                              const minFormatted = this._formatDate(minDate, dateInput.type);
                              this.formChippy.validation.showInputError(dateInput, 
                                  `Please select a date on or after ${minFormatted}`);
                          }
                      }
                      
                      // Check max date
                      if (dateInput.hasAttribute('max')) {
                          const maxDate = new Date(dateInput.getAttribute('max'));
                          if (inputValue > maxDate) {
                              const maxFormatted = this._formatDate(maxDate, dateInput.type);
                              this.formChippy.validation.showInputError(dateInput, 
                                  `Please select a date on or before ${maxFormatted}`);
                          }
                      }
                  }
              });
          });
      }
      
      /**
       * Format a date object based on the input type
       * @param {Date} date - The date to format
       * @param {string} type - The input type (date, time, datetime-local)
       * @returns {string} - Formatted date string
       * @private
       */
      _formatDate(date, type) {
          if (type === 'time') {
              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (type === 'datetime-local') {
              return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
              return date.toLocaleDateString();
          }
      }
      
      /**
       * Enhance a date input with better UI
       * @param {HTMLInputElement} dateInput - The date input element
       * @private
       */
      _enhanceDateInput(dateInput) {
          // Skip if already enhanced
          if (dateInput.closest('.fc-date-container')) return;
          
          // Create container
          const container = document.createElement('div');
          container.className = 'fc-date-container';
          
          // Get input type
          const inputType = dateInput.type || 'date';
          container.setAttribute('data-fc-date-type', inputType);
          
          // Insert container before input
          dateInput.parentNode.insertBefore(container, dateInput);
          
          // Move input inside container
          container.appendChild(dateInput);
          
          // Create calendar icon
          const icon = document.createElement('span');
          icon.className = 'fc-date-icon';
          
          // Set icon based on input type
          if (inputType === 'time') {
              icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"></path></svg>';
          } else {
              icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="currentColor"></path></svg>';
          }
          
          container.appendChild(icon);
          
          // Create display element (for showing formatted date)
          const display = document.createElement('div');
          display.className = 'fc-date-display';
          
          // Set initial display text
          if (dateInput.value) {
              display.textContent = this._formatDate(new Date(dateInput.value), inputType);
          } else {
              display.textContent = dateInput.getAttribute('placeholder') || 'Select date';
              display.classList.add('fc-date-placeholder');
          }
          
          container.appendChild(display);
          
          // Add event listeners
          container.addEventListener('click', () => {
              dateInput.focus();
              if (inputType === 'date' || inputType === 'datetime-local') {
                  // For mobile, we might need to create a custom calendar
                  // This is a simple solution that uses the native picker
                  dateInput.showPicker && dateInput.showPicker();
              }
          });
          
          // Update display when value changes
          dateInput.addEventListener('change', () => {
              if (dateInput.value) {
                  display.textContent = this._formatDate(new Date(dateInput.value), inputType);
                  display.classList.remove('fc-date-placeholder');
              } else {
                  display.textContent = dateInput.getAttribute('placeholder') || 'Select date';
                  display.classList.add('fc-date-placeholder');
              }
          });
          
          // Hide the actual input for better UI
          dateInput.classList.add('fc-date-input-enhanced');
      }
      
      /**
       * Create a date input with the specified configuration
       * @param {HTMLElement} container - The container to append the date input to
       * @param {object} config - Configuration options
       * @returns {HTMLInputElement} The created date input
       */
      createDateInput(container, config) {
          const {
              name,
              id = name,
              type = 'date',
              placeholder = type === 'date' ? 'Select date' : 
                           type === 'time' ? 'Select time' : 'Select date and time',
              value = '',
              min,
              max,
              required = false,
              autoAdvance = false,
              enhanced = true,
              label = '',
              step
          } = config;
          
          // Create form group wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'fc-form-group';
          
          // Add label if provided
          if (label) {
              const labelEl = document.createElement('label');
              labelEl.setAttribute('for', id);
              labelEl.textContent = label;
              wrapper.appendChild(labelEl);
          }
          
          // Create date input
          const dateInput = document.createElement('input');
          dateInput.type = type;
          dateInput.id = id;
          dateInput.name = name;
          dateInput.placeholder = placeholder;
          dateInput.setAttribute('data-fc-input', '');
          dateInput.setAttribute('data-fc-date', '');
          
          // Set additional attributes
          if (value) dateInput.value = value;
          if (min) dateInput.setAttribute('min', min);
          if (max) dateInput.setAttribute('max', max);
          if (step) dateInput.setAttribute('step', step);
          if (required) {
              dateInput.required = true;
              dateInput.setAttribute('data-fc-required', '');
          }
          if (autoAdvance) dateInput.setAttribute('data-fc-auto-advance', '');
          if (enhanced) dateInput.setAttribute('data-fc-enhanced', '');
          
          // Add date input to wrapper
          wrapper.appendChild(dateInput);
          
          // Add wrapper to container
          container.appendChild(wrapper);
          
          // Enhance date input if enabled
          if (enhanced) {
              this._enhanceDateInput(dateInput);
          }
          
          return dateInput;
      }
      
      /**
       * Create a date range input with start and end dates
       * @param {HTMLElement} container - The container to append the date range to
       * @param {object} config - Configuration options
       * @returns {object} An object containing the start and end date inputs
       */
      createDateRangeInput(container, config) {
          const {
              startName,
              endName,
              startId = startName,
              endId = endName,
              type = 'date',
              startPlaceholder = 'Start date',
              endPlaceholder = 'End date',
              startValue = '',
              endValue = '',
              min,
              max,
              required = false,
              enhanced = true,
              label = ''
          } = config;
          
          // Create form group wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'fc-form-group';
          
          // Add label if provided
          if (label) {
              const labelEl = document.createElement('label');
              labelEl.textContent = label;
              wrapper.appendChild(labelEl);
          }
          
          // Create date range container
          const rangeContainer = document.createElement('div');
          rangeContainer.className = 'fc-date-range';
          
          // Create start date input
          const startDateConfig = {
              name: startName,
              id: startId,
              type,
              placeholder: startPlaceholder,
              value: startValue,
              min,
              max,
              required,
              enhanced,
              label: '' // No inner label for range inputs
          };
          
          const startDateWrapper = document.createElement('div');
          startDateWrapper.className = 'fc-date-range-start';
          rangeContainer.appendChild(startDateWrapper);
          
          const startDate = this.createDateInput(startDateWrapper, startDateConfig);
          
          // Create range separator
          const separator = document.createElement('span');
          separator.className = 'fc-date-range-separator';
          separator.textContent = 'to';
          rangeContainer.appendChild(separator);
          
          // Create end date input
          const endDateConfig = {
              name: endName,
              id: endId,
              type,
              placeholder: endPlaceholder,
              value: endValue,
              min: startValue || min, // Start with the same min as start date
              max,
              required,
              enhanced,
              label: '' // No inner label for range inputs
          };
          
          const endDateWrapper = document.createElement('div');
          endDateWrapper.className = 'fc-date-range-end';
          rangeContainer.appendChild(endDateWrapper);
          
          const endDate = this.createDateInput(endDateWrapper, endDateConfig);
          
          // Add range container to wrapper
          wrapper.appendChild(rangeContainer);
          
          // Add wrapper to container
          container.appendChild(wrapper);
          
          // Set up interdependent validation
          startDate.addEventListener('change', () => {
              if (startDate.value) {
                  // Update end date min value to be the selected start date
                  endDate.min = startDate.value;
                  
                  // Show error if end date is before start date
                  if (endDate.value && new Date(endDate.value) < new Date(startDate.value)) {
                      this.formChippy.validation.showInputError(endDate, 
                          'End date must be after start date');
                  }
              }
          });
          
          endDate.addEventListener('change', () => {
              if (endDate.value && startDate.value) {
                  // Show error if end date is before start date
                  if (new Date(endDate.value) < new Date(startDate.value)) {
                      this.formChippy.validation.showInputError(endDate, 
                          'End date must be after start date');
                  }
              }
          });
          
          return { startDate, endDate };
      }
  }
  
  
  /**
   * FormChippy.js v1.1.0
   * A smooth, vertical scrolling multi-step form experience
   * Created for L&C Mortgage Finder
   *
   * @license MIT
   * @author JP
   */
  
  // Import core modules
  
  
  
  
  
  // Import question types
  
  
  
  
  
  
  
  window.FormChippy = class FormChippy {
      constructor(options = {}) {
          // Default options
          this.options = {
              containerSelector: '[data-fc-container]',
              slideListSelector: '[data-fc-slide-list]',
              slideSelector: '[data-fc-slide]',
              contentSelector: '[data-fc-content]',
              inputSelector: '[data-fc-input]',
              buttonSelector: '[data-fc-button]',
              submitSelector: '[data-fc-submit]',
              progressSelector: '[data-fc-progress]',
              dotsSelector: '[data-fc-dots]',
              dotSelector: '[data-fc-dot]',
              activeClass: 'fc-slideactive',
              animationDelay: 800,
              useIntersectionObserver: false, // Disable auto-navigation by scrolling by default
              validateByDefault: true, // Whether to validate by default (can be overridden by data-fc-validate attribute)
              autoInitialize: true, // Whether to auto-initialize on load
              scrollPosition: 'center', // How to position active slides: 'start', 'center', 'end', or 'nearest'
              ...options,
          };
  
          // State
          this.currentSlideIndex = 0;
          this.slides = [];
          this.dots = [];
          this.isAnimating = false;
          this.formData = {};
          this.eventHandlers = {}; // Event handling system
  
          // Modules
          this.navigation = null;
          this.validation = null;
          this.progress = null;
          this.debug = null;
          this.questionHandlers = {};
  
          // Initialize
          this._init();
      }
      
      /**
       * Register an event handler
       * @param {string} event - Event name
       * @param {Function} handler - Event handler function
       * @returns {FormChippy} - For chaining
       */
      on(event, handler) {
          if (!this.eventHandlers[event]) {
              this.eventHandlers[event] = [];
          }
          this.eventHandlers[event].push(handler);
          return this;
      }
      
      /**
       * Remove an event handler
       * @param {string} event - Event name
       * @param {Function} handler - Event handler function (optional, if not provided, all handlers for event are removed)
       * @returns {FormChippy} - For chaining
       */
      off(event, handler) {
          if (!this.eventHandlers[event]) return this;
          
          if (!handler) {
              delete this.eventHandlers[event];
              return this;
          }
          
          this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
          return this;
      }
      
      /**
       * Trigger an event
       * @param {string} event - Event name
       * @param {any} data - Event data
       * @returns {FormChippy} - For chaining
       */
      trigger(event, data) {
          if (this.debug) {
              this.debug.info(`Event triggered: ${event}`, data);
          }
          
          if (!this.eventHandlers[event]) return this;
          
          this.eventHandlers[event].forEach(handler => {
              try {
                  handler(data);
              } catch (error) {
                  if (this.debug && this.debug.enabled) {
                      this.debug.error(`Error in event handler for ${event}:`, error);
                  } else {
                      console.error(`[FormChippy] Error in event handler for ${event}:`, error);
                  }
              }
          });
          
          return this;
      }
  
      /**
       * Initialize FormChippy
       * @private
       */
      _init() {
          // Get main elements
          this.container = document.querySelector(this.options.containerSelector);
          if (!this.container) {
              console.error('FormChippy: Container not found');
              return;
          }
  
          this.formName = this.container.getAttribute('data-fc-container') || 'form';
          
          // Default to Typeform-like controlled navigation (no scrolling)
          // Only allow scrolling when explicitly enabled with data-fc-allow-scroll
          this.allowScrolling = this.container.hasAttribute('data-fc-allow-scroll');
          
          // Create or find the slide list element
          this.slideList = this.container.querySelector(this.options.slideListSelector);
          if (!this.slideList) {
              // If no slide list exists, create one and move slides into it
              this.slideList = document.createElement('div');
              this.slideList.setAttribute('data-fc-slide-list', '');
              
              // Find all slides that are direct children of the container
              const directSlides = Array.from(this.container.querySelectorAll(':scope > ' + this.options.slideSelector));
              
              // If direct slides exist, move them into the slide list
              if (directSlides.length > 0) {
                  directSlides.forEach(slide => {
                      this.slideList.appendChild(slide);
                  });
                  // Insert the slide list where the first slide was
                  this.container.appendChild(this.slideList);
              } else {
                  // No direct slides, first add the slide list to the container
                  this.container.appendChild(this.slideList);
              }
          }
          
          // Get all slides within the slide list
          this.slides = Array.from(this.slideList.querySelectorAll(this.options.slideSelector));
          this.totalSlides = this.slides.length;
          
          // Get validation setting from data attribute (if present) or use the default
          const validateAttr = this.container.getAttribute('data-fc-validate');
          this.validationEnabled = validateAttr !== null ? validateAttr === 'true' : this.options.validateByDefault;
          
          // Log validation state
          if (!this.validationEnabled) {
              console.info('FormChippy: Validation is disabled via data-fc-validate attribute');
          }
  
          if (this.totalSlides === 0) {
              console.error('FormChippy: No slides found');
              return;
          }
  
          // Use querySelector within the container to ensure we get the correct elements
          this.progressContainer = this.container.querySelector(this.options.progressSelector);
          this.dotsContainer = this.container.querySelector(this.options.dotsSelector);
          
          // The actual progress bar fill element will be set by the Progress class later
          this.progressBar = null;
  
          // Initialize modules
          this.debug = new Debug(this);
          this.validation = new Validation(this);
          this.navigation = new Navigation(this);
          this.progress = new Progress(this);
          
          // Log initialization
          this.debug.info('FormChippy initializing', {
              container: this.container.id || 'no-id',
              slides: this.totalSlides,
              formName: this.formName
          });
  
          // Initialize question handlers
          this.questionHandlers = {
              text: new TextInput(this),
              radio: new RadioInput(this),
              toggle: new ToggleInput(this),
              file: new FileInput(this),
              textarea: new TextareaInput(this),
              date: new DateInput(this)
          };
  
          // Generate slide IDs if not set
          this._generateSlideIds();
  
          // Set up form elements
          this.navigation.setupNavigation();
          this.progress.createProgressBar(); // Create the progress bar with proper structure
          this.progress.createNavigationDots();
          
          // Apply no-scroll mode by default (Typeform style UX)
          // Only allow scrolling when explicitly requested
          if (!this.allowScrolling) {
              this._setupNoScrollMode();
          } else {
              this.debug.info('Scroll navigation enabled: Users can navigate by scrolling');
          }
  
          // Handle window resize
          window.addEventListener('resize', this._handleResize.bind(this));
  
          // Initialize first slide and ensure it's properly active
          this._updateActiveSlide(0);
          
          // Explicitly add active class and setup tab navigation for first slide
          if (this.slides.length > 0) {
              const firstSlide = this.slides[0];
              firstSlide.classList.add(this.options.activeClass);
              
              // Ensure all elements in first slide have proper tabindex
              // This runs after _updateActiveSlide to ensure tab navigation works immediately on page load
              this._setupActiveSlideTabbing(firstSlide);
              
              // If there's a focusable element, highlight it visually (optional)
              const firstInput = firstSlide.querySelector('input, select, textarea, button:not([data-fc-button-prev])');
              if (firstInput) {
                  // Don't auto-focus on mobile devices to avoid keyboard popping up immediately
                  if (window.innerWidth > 768) {
                      setTimeout(() => firstInput.focus(), 100);
                  }
              }
              
              this.debug.info(`First slide activated: ${firstSlide.getAttribute('data-fc-slide')}`);
          }
  
          this.debug.info(`FormChippy initialized for form: ${this.formName}`);
      }
  
      /**
       * Generate unique IDs for slides if not already set
       * @private
       */
      _generateSlideIds() {
          this.slides.forEach((slide, index) => {
              if (!slide.getAttribute('data-fc-slide') || slide.getAttribute('data-fc-slide') === '') {
                  slide.setAttribute('data-fc-slide', `slide-${index + 1}`);
              }
          });
      }
  
      /**
       * Handle window resize
       * @private
       */
      _handleResize() {
          // Re-scroll to current slide to maintain correct positioning
          if (!this.isAnimating) {
              this.goToSlide(this.currentSlideIndex, false);
          }
      }
      
      /**
       * Setup no-scroll mode for Typeform-like UX experience
       * - Disables internal form scrolling while allowing page to scroll underneath
       * - Users navigate only with buttons and dots
       * @private
       */
      _setupNoScrollMode() {
          if (!this.slideList) return;
          
          // Directly modify the style to prevent scrolling inside the form
          this.slideList.style.overflowY = 'hidden';
          this.slideList.style.scrollBehavior = 'auto';
          
          // Make sure the container doesn't trap scroll events
          if (this.container) {
              this.container.style.overflow = 'visible';
          }
          
          // Key mapping for navigation only when form is focused
          // (We're not preventing wheel or touch events to allow page scrolling)
          this.slideList.addEventListener('keydown', (e) => {
              // Only prevent default if the focus is within the slideList
              if (this.slideList.contains(document.activeElement)) {
                  // Map keys to navigation actions
                  if (['ArrowDown', 'PageDown'].includes(e.key)) {
                      e.preventDefault();
                      this.goToNextSlide();
                  } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
                      e.preventDefault();
                      this.goToPrevSlide();
                  }
              }
          });
          
          this.debug.info('Typeform-style navigation enabled: Form prevents internal scrolling but allows page to scroll underneath');
      }
  
      /**
       * Update active slide accessibility and tab order
       * @param {number} index - Slide index
       * @private
       */
      _updateActiveSlide(index) {
          // Prevent updates if we're already animating to avoid loops
          if (this.isAnimating && index !== this.currentSlideIndex) {
              this.debug.info(`_updateActiveSlide: Skipping update during animation`, {
                  requestedIndex: index,
                  currentIndex: this.currentSlideIndex
              });
              return;
          }
          
          // Log slide change
          const previousIndex = this.currentSlideIndex;
          
          // Only log if there's an actual change (avoid noisy logs)
          if (previousIndex !== index) {
              this.debug.logSlideChange(previousIndex, index);
          }
          
          // IMPORTANT: We don't set currentSlideIndex here anymore
          // It's now set in goToSlide before calling this method
          
          // Update accessibility and tab order for all slides
          this.slides.forEach((slide, i) => {
              const isActive = i === index;
              
              // Manage tab indices and focus for accessibility
              if (isActive) {                
                  // Make all focusable elements in active slide reachable by tab
                  this._setupActiveSlideTabbing(slide);
              } else {                
                  // Remove all inactive slide elements from tab order
                  const allElements = slide.querySelectorAll('*');
                  allElements.forEach(el => {
                      if (el.getAttribute('tabindex') !== '-1') {
                          el.setAttribute('tabindex', '-1');
                      }
                  });
              }
          });
  
          // Update dots and progress
          this.progress.updateProgress(index);
          
          // Focus on first input if present
          setTimeout(() => {
              const activeInput = this.slides[index].querySelector(this.options.inputSelector);
              if (activeInput) {
                  activeInput.focus();
              }
          }, this.options.animationDelay);
          
          // Trigger slide change event
          const slideChangeEvent = new CustomEvent('formchippy:slideChange', {
              detail: {
                  currentSlide: index + 1,
                  totalSlides: this.totalSlides,
                  slideId: this.slides[index].getAttribute('data-fc-slide'),
              },
              bubbles: true,
          });
  
          this.container.dispatchEvent(slideChangeEvent);
      }
      
      /**
       * Update only visual indicators without changing current slide
       * @param {number} index - Slide index to highlight visually
       * @private
       */
      _updateActiveVisuals(index) {
          // Only update the progress and dots, don't change the current slide
          this.progress.updateProgress(index);
          
          // Update active class on slides visually
          this.slides.forEach((slide, i) => {
              if (i === index) {
                  slide.classList.add(this.options.activeClass);
              } else {
                  slide.classList.remove(this.options.activeClass);
              }
          });
      }
      
      /**
       * Setup tab order for active slide elements
       * Ensures proper tab navigation from inputs to navigation buttons
       * @param {HTMLElement} slide - Active slide to setup tab navigation for
       * @private
       */
      _setupActiveSlideTabbing(slide) {
          // First gather all focusable elements in a logical order
          const inputs = Array.from(slide.querySelectorAll('input, select, textarea'));
          const buttons = Array.from(slide.querySelectorAll('button, [role="button"], [data-fc-button]'));
          const otherFocusables = Array.from(slide.querySelectorAll('[href], [tabindex]:not([tabindex="-1"])'));
          
          // Filter out elements that are already in the inputs or buttons arrays
          const uniqueOtherFocusables = otherFocusables.filter(el => 
              !inputs.includes(el) && !buttons.includes(el)
          );
          
          // Create ordered array of all focusable elements
          // Order: inputs first, then other focusables, then buttons last
          const allFocusables = [...inputs, ...uniqueOtherFocusables, ...buttons];
          
          // First, clean up any previous event listeners from other slides
          this._cleanupTabEventListeners();
          
          // Make all focusable elements in this slide reachable by tab
          allFocusables.forEach(el => {
              // Store original tabindex for restoration if needed
              if (!el._fcOriginalTabindex && el.hasAttribute('tabindex')) {
                  el._fcOriginalTabindex = el.getAttribute('tabindex');
              }
              // Enable tabbing
              el.setAttribute('tabindex', '0');
          });
          
          // Handle special tab behavior for the last input
          if (inputs.length > 0 && buttons.length > 0) {
              const lastInput = inputs[inputs.length - 1];
              
              // Clean up previous listener if any
              if (lastInput._fcTabHandler) {
                  lastInput.removeEventListener('keydown', lastInput._fcTabHandler);
              }
              
              // Create new handler
              const newHandler = (e) => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                      // Find the proper button to focus next (usually next/submit button)
                      const nextButton = buttons.find(btn => 
                          !btn.hasAttribute('data-fc-button-prev')
                      ) || buttons[0];
                      
                      if (nextButton) {
                          e.preventDefault();
                          nextButton.focus();
                      }
                  }
              };
              
              // Store the handler reference for later cleanup
              lastInput._fcTabHandler = newHandler;
              this._activeTabHandlers = this._activeTabHandlers || [];
              this._activeTabHandlers.push({ element: lastInput, handler: newHandler });
              
              // Add the event listener
              lastInput.addEventListener('keydown', newHandler);
          }
          
          // Set focus trap within the active slide
          this._setupFocusTrap(slide, allFocusables);
      }
      
      /**
       * Clean up tab event listeners from previous slides
       * @private
       */
      _cleanupTabEventListeners() {
          // Clean up any previously stored handlers
          if (this._activeTabHandlers) {
              this._activeTabHandlers.forEach(item => {
                  if (item.element && item.handler) {
                      item.element.removeEventListener('keydown', item.handler);
                  }
              });
              this._activeTabHandlers = [];
          }
          
          // Clean up trap handlers
          if (this._activeTrapHandlers) {
              this._activeTrapHandlers.forEach(item => {
                  if (item.element && item.handler) {
                      item.element.removeEventListener('keydown', item.handler);
                  }
              });
              this._activeTrapHandlers = [];
          }
      }
      
      /**
       * Setup focus trap to keep focus within the active slide
       * @param {HTMLElement} slide - Active slide to trap focus within
       * @param {Array} focusableElements - Focusable elements in the slide
       * @private
       */
      _setupFocusTrap(slide, focusableElements) {
          if (focusableElements.length === 0) return;
          
          const firstFocusable = focusableElements[0];
          const lastFocusable = focusableElements[focusableElements.length - 1];
          
          // Initialize trap handlers array if needed
          this._activeTrapHandlers = this._activeTrapHandlers || [];
          
          // Add event listener to the first focusable element
          const firstHandler = (e) => {
              if (e.key === 'Tab' && e.shiftKey) {
                  e.preventDefault();
                  lastFocusable.focus();
              }
          };
          
          // Add event listener to the last focusable element
          const lastHandler = (e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  firstFocusable.focus();
              }
          };
          
          // Store handlers for cleanup
          this._activeTrapHandlers.push(
              { element: firstFocusable, handler: firstHandler },
              { element: lastFocusable, handler: lastHandler }
          );
          
          // Add event listeners
          firstFocusable.addEventListener('keydown', firstHandler);
          lastFocusable.addEventListener('keydown', lastHandler);
      }
  
      /**
       * Go to a specific slide
       * @param {number} index - Slide index
       * @param {boolean} animate - Whether to animate the scroll
       * @public
       */
      goToSlide(index, animate = true) {
          // SIMPLIFIED NAVIGATION FLOW - Single source of truth approach
          
          // 1. VALIDATION: Check if index is valid
          if (index < 0 || index >= this.totalSlides) {
              this.debug.info(`Navigation rejected: Target index ${index} is out of bounds (0-${this.totalSlides - 1})`);
              return;
          }
  
          // ===== ULTIMATE ANTI-JITTER SYSTEM =====
          // Initialize navigation state tracking if not already done
          if (!this._navigationState) {
              this._navigationState = {
                  lastTime: 0,
                  pending: null,
                  debounceTime: 500, // Increased buffer to ensure animations complete
                  inProgress: false,
                  queue: [],
                  maxQueueSize: 3
              };
          }
          
          // 1. TIMING GUARD: Calculate time since last navigation for jitter prevention
          const now = Date.now();
          const timeSinceLastNav = now - this._navigationState.lastTime;
          
          // 2. CLEAR PENDING: Cancel any pending (not yet executed) navigation attempts
          if (this._navigationState.pending) {
              clearTimeout(this._navigationState.pending);
              this._navigationState.pending = null;
          }
          
          // 3. DUPLICATE/JITTER CHECK: Block navigation if:
          //    - We're already navigating AND
          //    - This request came too soon after previous one AND
          //    - We're trying to navigate to a different slide than current target in queue
          if (this.isAnimating && 
              timeSinceLastNav < this._navigationState.debounceTime) {
              
              // Add to queue for extremely rapid clicking (optional - improves UX)
              if (this._navigationState.queue.length < this._navigationState.maxQueueSize &&
                  !this._navigationState.queue.includes(index)) {
                  
                  this._navigationState.queue.push(index);
                  this.debug.info(`JITTER PREVENTION: Navigation to slide ${index} queued. Too soon after previous navigation: ${timeSinceLastNav}ms`);
                  
                  // Schedule this navigation for later when animations are done
                  this._navigationState.pending = setTimeout(() => {
                      const nextIndex = this._navigationState.queue.shift();
                      if (nextIndex !== undefined && nextIndex !== this.currentSlideIndex) {
                          this.debug.info(`QUEUED NAVIGATION: Now processing navigation to slide ${nextIndex}`);
                          this.goToSlide(nextIndex, true, true); // Force parameter to bypass jitter check
                      }
                  }, this._navigationState.debounceTime);
              }
              
              // Skip immediate navigation attempt
              return;
          }
          
          // Update navigation timestamp and state
          this._navigationState.lastTime = now;
          this._navigationState.inProgress = true;
          
          // Skip if already on this slide (optimization)
          if (index === this.currentSlideIndex && !this.isAnimating) {
              this.debug.info(`Navigation skipped: Already on slide ${index}`);
              return;
          }
  
          // Set animation flag to block other navigation attempts
          this.isAnimating = true;
          
          // Record slide info and indexes
          const targetSlideId = this.slides[index].getAttribute('data-fc-slide');
          const oldIndex = this.currentSlideIndex;
          
          // Log navigation start with additional debugging info
          this.debug.info(`NAVIGATION START: ${oldIndex} → ${index} (${targetSlideId})`, {
              animate,
              timeSinceLastNav
          });
          
          // === CRITICAL: Update slide position tracking as single source of truth ===
          // Initialize slide position tracker if not yet done
          if (!this._slidePositionTracker) {
              this._slidePositionTracker = {
                  currentIndex: 0,
                  maxVisitedIndex: 0,  // Track the furthest slide user has visited
                  history: [0],         // Full navigation history
                  get progressPosition() {
                      // Progress is based on current position relative to max form length
                      return this.currentIndex;
                  }
              };
          }
          
          // Update the position tracker with the new index
          this._slidePositionTracker.currentIndex = index;
          this._slidePositionTracker.history.push(index);
          
          // Update max position for progress calculation
          if (index > this._slidePositionTracker.maxVisitedIndex) {
              this._slidePositionTracker.maxVisitedIndex = index;
          }
          
          // Update current index immediately to prevent race conditions
          this.currentSlideIndex = index;
          
          // Group all DOM updates in a single animation frame for better performance
          requestAnimationFrame(() => {
              // 1. Update slide classes
              this.slides.forEach((slide, i) => {
                  slide.classList.toggle(this.options.activeClass, i === index);
              });
              
              // 2. Update UI indicators using the slide position tracker as source of truth
              const progressPos = this._slidePositionTracker ? this._slidePositionTracker.currentIndex : index;
              
              // Use the position tracker to update all UI components
              this.progress.updateProgress(progressPos);
              this.navigation.updateSlideCounter(progressPos);
              this.navigation.updateButtonStates(index); // Explicitly update button states
              this._updateActiveSlide(index);
              
              // 3. Schedule scrolling in next frame for smoother animation
              requestAnimationFrame(() => {
                  const targetSlide = this.slides[index];
                  
                  // Check for slide-specific position override
                  let scrollPosition = targetSlide.getAttribute('data-fc-slide-position');
                  
                  // If no slide-specific position, use the global default
                  if (!scrollPosition) {
                      scrollPosition = this.options.scrollPosition || 'center';
                  }
                  
                  // Smart default: Use 'start' position if slide height is larger than visible area
                  if (scrollPosition === 'center' || scrollPosition === 'end') {
                      // Get the slide and container dimensions
                      const slideHeight = targetSlide.offsetHeight;
                      const containerHeight = this.slideList.offsetHeight;
                      
                      // If slide is taller than container, default to 'start' for better UX
                      if (slideHeight > containerHeight * 0.8) {
                          this.debug.info(`Large slide detected (${slideHeight}px > ${containerHeight * 0.8}px). Using 'start' position instead of '${scrollPosition}'`);
                          scrollPosition = 'start';
                      }
                  }
                  
                  // Apply scroll behavior
                  targetSlide.scrollIntoView({
                      behavior: animate ? 'smooth' : 'auto',
                      block: scrollPosition, // Options: 'start', 'center', 'end', 'nearest'
                  });
                  
                  // Calculate appropriate cleanup delay
                  const animationDuration = animate ? this.options.animationDelay + 50 : 50;
                  
                  // Schedule cleanup after animation completes with enhanced state handling
                  this._navigationState.pending = setTimeout(() => {
                      // Reset animation flags
                      this.isAnimating = false;
                      this._navigationState.inProgress = false;
                      
                      // Log completion for debugging
                      this.debug.info(`NAVIGATION COMPLETE: ${oldIndex} → ${index} (${targetSlideId})`);
                      
                      // Trigger completion event
                      this.trigger('navigationComplete', {
                          fromIndex: oldIndex,
                          toIndex: index,
                          slideId: targetSlideId
                      });
                      
                      // Force button state update after animation completes
                      this.navigation.updateButtonStates(index);
                      
                      // Process next navigation in queue if any
                      if (this._navigationState.queue.length > 0) {
                          const nextIndex = this._navigationState.queue.shift();
                          if (nextIndex !== undefined && nextIndex !== this.currentSlideIndex) {
                              // Wait a tiny bit before starting next navigation for smoother experience
                              setTimeout(() => {
                                  this.debug.info(`PROCESSING QUEUED NAVIGATION to slide ${nextIndex}`);
                                  this.goToSlide(nextIndex, true, true);
                              }, 50);
                          }
                      }
                  }, animationDuration);
              });
          });
      }
  
      /**
       * Go to the next slide
       * @public
       */
      next() {
          // Use the position tracker for current position if available
          const tracker = this._slidePositionTracker;
          const currentIndex = tracker ? tracker.currentIndex : this.currentSlideIndex;
          
          if (currentIndex < this.totalSlides - 1) {
              // Get the current slide element
              const currentSlide = this.slides[currentIndex];
              
              // Log the navigation attempt with source of truth
              const slideId = currentSlide.getAttribute('data-fc-slide');
              this.debug.info(`Next() method called from slide ${slideId}`, {
                  validationEnabled: this.validationEnabled,
                  currentIndex: currentIndex,
                  targetIndex: currentIndex + 1,
                  trackerExists: !!tracker,
                  trackerCurrentIndex: tracker ? tracker.currentIndex : null,
                  formCurrentIndex: this.currentSlideIndex
              });
              
              // Check validation only if enabled
              if (!this.validationEnabled || this.validation.validateSlide(currentSlide)) {
                  // Calculate the exact next index to prevent any confusion
                  const nextIndex = currentIndex + 1;
                  this.debug.info(`Next: Navigating from ${currentIndex} to ${nextIndex}`);
                  this.goToSlide(nextIndex);
              } else {
                  this.debug.info('Navigation blocked: Validation failed and validation is enabled');
              }
          } else {
              this.debug.info(`Next: Already at last slide (index ${currentIndex}), cannot go further`);
          }
      }
  
      /**
       * Go to the previous slide
       * @public
       */
      prev() {
          // Use the position tracker for current position if available
          const tracker = this._slidePositionTracker;
          const currentIndex = tracker ? tracker.currentIndex : this.currentSlideIndex;
          
          if (currentIndex > 0) {
              const currentSlide = this.slides[currentIndex];
              
              // Calculate the exact previous index
              const prevIndex = currentIndex - 1;
              
              // Log the navigation attempt with source of truth
              const slideId = currentSlide.getAttribute('data-fc-slide');
              this.debug.info(`Prev() method called from slide ${slideId}`, {
                  currentIndex: currentIndex,
                  targetIndex: prevIndex,
                  trackerExists: !!tracker,
                  trackerCurrentIndex: tracker ? tracker.currentIndex : null,
                  formCurrentIndex: this.currentSlideIndex
              });
              
              // Previous navigation is always allowed regardless of validation
              this.debug.info(`Prev: Navigating from ${currentIndex} to ${prevIndex}`);
              this.goToSlide(prevIndex);
          } else {
              this.debug.info(`Prev: Already at first slide (index ${currentIndex}), cannot go back`);
          }
      }
  
      /**
       * Get the current slide index
       * @returns {number} - Current slide index (0-based)
       * @public
       */
      getCurrentSlide() {
          return this.currentSlideIndex;
      }
  
      /**
       * Get the total number of slides
       * @returns {number} - Total number of slides
       * @public
       */
      getTotalSlides() {
          return this.totalSlides;
      }
  
      /**
       * Check if a slide is valid (all required fields filled)
       * @param {number} index - Slide index to check
       * @returns {boolean} - True if valid, false if not
       * @public
       */
      isSlideValid(index) {
          if (index < 0 || index >= this.totalSlides) {
              return false;
          }
  
          return this.validation.validateSlide(this.slides[index]);
      }
  
      /**
       * Reset the form to its initial state
       * @public
       */
      reset() {
          // Clear all inputs
          const inputs = this.container.querySelectorAll(this.options.inputSelector);
          inputs.forEach((input) => {
              input.value = '';
              this.validation.clearInputError(input);
          });
  
          // Go to first slide
          this.goToSlide(0);
  
          // Reset form data
          this.formData = {};
  
          // Trigger reset event
          const resetEvent = new CustomEvent('formchippy:reset', {
              bubbles: true,
          });
  
          this.container.dispatchEvent(resetEvent);
      }
  
      /**
       * Update options after initialization
       * @param {Object} options - New options
       * @public
       */
      updateOptions(options = {}) {
          this.options = {
              ...this.options,
              ...options,
          };
      }
  
      /**
       * Destroy the FormChippy instance
       * @public
       */
      destroy() {
          // Remove event listeners
          window.removeEventListener('resize', this._handleResize.bind(this));
  
          // Cleanup modules
          this.navigation.destroy();
          this.progress.destroy();
  
          // Remove classes
          this.slides.forEach((slide) => {
              slide.classList.remove(this.options.activeClass);
          });
  
          // Trigger destroy event
          const destroyEvent = new CustomEvent('formchippy:destroy', {
              bubbles: true,
          });
  
          this.container.dispatchEvent(destroyEvent);
  
          console.log(`FormChippy destroyed for form: ${this.formName}`);
      }
  }
  
  // Store instances for access
  const instances = {};
  
  // Auto-initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
      // Find all containers with the data-fc-container attribute
      const containers = document.querySelectorAll('[data-fc-container]');
      
      containers.forEach((container) => {
          const formName = container.getAttribute('data-fc-container');
          const autoInitAttr = container.getAttribute('data-fc-auto-init');
          
          // If auto-init is explicitly set to false, skip this container
          if (autoInitAttr !== null && autoInitAttr === 'false') {
              console.info(`FormChippy: Skipping auto-init for ${formName} due to data-fc-auto-init="false"`);
              return;
          }
          
          // Create FormChippy instance with specific container options
          instances[formName] = new FormChippy({
              containerSelector: `[data-fc-container="${formName}"]`
          });
      });
  });
  
  // Global API
  window.formChippy = {
      /**
       * Get instance by form name
       * @param {string} formName - Name of the form
       * @returns {FormChippy|null} FormChippy instance or null if not found
       */
      getInstance: (formName) => {
          return instances[formName] || null;
      },
      
      /**
       * Create a new instance
       * @param {Object} options - FormChippy options
       * @returns {FormChippy} New FormChippy instance
       */
      create: (options) => {
          const instance = new FormChippy(options);
          if (instance.container) {
              const formName = instance.formName;
              instances[formName] = instance;
          }
          return instance;
      },
      
      /**
       * Initialize all FormChippy instances in the document
       * This can be called manually if the DOM is dynamically loaded
       */
      initAll: () => {
          const containers = document.querySelectorAll('[data-fc-container]');
          
          containers.forEach((container) => {
              const formName = container.getAttribute('data-fc-container');
              const autoInitAttr = container.getAttribute('data-fc-auto-init');
              
              // If already initialized or auto-init is false, skip
              if (instances[formName] || (autoInitAttr !== null && autoInitAttr === 'false')) {
                  return;
              }
              
              // Create FormChippy instance with specific container options
              instances[formName] = new FormChippy({
                  containerSelector: `[data-fc-container="${formName}"]`
              });
          });
          
          return instances;
      }
  };
  
  
  
  
  
    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      new FormChippy();
    });
  })();