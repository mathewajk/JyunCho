// experiment.js

// This file defines the Experiment object that is initialized in runner.js.
// The experiment's timeline and trials live here.

// Stimuli are defined in data/stimuli.json. This file is loaded by runner.js.
// The contents of this file are passed to the params variable of the
// Experiment object.

function Experiment(params, firebaseStorage) {

    /******************
     * Experiment flow
     ******************/

    // Initialize the experiment timeline
    var timeline = [];

    // Function to be called by jsPsych at the very end of the experiment
    this.onFinish = function() {
      // TODO: Add redirect
    }


    /******************
     * Data storage
     ******************/

    // Initialize a variable to store participant information
    // TODO: Add more participant parameters here if needed.
    var participant = {
      id: params.participantId
    }

    // Initialize a variable to store experiment information
    // TODO: Add more experiment parameters here if needed.
    var experimentData = {
      test: (params.list == "test" ? true : false),
      conditions: params.experimental_conditions.concat(params.subexperiment_conditions).concat(params.filler_conditions),
      list: params.list
    }

    // This function adds data to jsPsych's internal representation of the
    // experiment. Can be called at any time.
    this.addPropertiesTojsPsych = function () {
      jsPsych.data.addProperties({
        participant: participant.id,
        list: experimentData.list
      });
    }

    this.setStorageLocation = function() {

      var currentDate = new Date();
      var prettyDate = [currentDate.getFullYear(),
                        currentDate.getMonth() + 1,
                        currentDate.getDate()].join('-');

      filename = experimentData.id + prettyDate + '/' + participant.id + '.csv'
      experimentData.storageLocation = firebaseStorage.ref().child(filename);

    }


    /**************************************************************************
    * BUILD THE TIMELINE
    ***************************************************************************/

    // This function builds the full experiment timeline using your individual
    // init functions. By building different phases of the experiment with their
    // own init functions, it is easy to turn on and off different parts of the
    // experiment during testing.

    this.createTimeline = function() {

      // initPreExperiment();

      var start = {
        "type": "instructions",
        "key_forward": " ",
        "show_clickable_nav": false,
        "allow_backward": false,
        "pages": params.instructions.start,
        "on_finish": function(start) {
            Jeeliz.toggle();
        }
      };

      timeline.push(start);

      if(experimentData.test) {
        initMockTrials();
      }
      else { initTrials(); }

      initPostExperiment();

    }


    /******************
     * Getter functions
     ******************/

    this.getParticipantId = function() { // Return current participant's ID
      return participant.id;
    }
    this.getExperimentId = function() {  // Return experiment's ID
      return experimentData.id;
    }
    this.getTimeline = function() {      // Return the timeline
      return timeline;
    }


    /************************************************************************
    * EXPERIMENT BLOCKS
    *************************************************************************/

    /***************************
    * Pre-experiment
    ****************************/

    // TODO: Currently a placeholder
    var initPreExperiment = function() {

      var welcome = {
          type: "html-keyboard-response",
          stimulus: "<p>ようこそ。</p>"
      };

      timeline.push(welcome);

    }

    /***************************
    * Trials
    ****************************/

    // This is the main function used to create a set of trials.
    var initTrials = function() {

      var list = params.item_list[experimentData.list-1];
      var stimuli = _.zip(list.id, list.audio, list.condition, list.experiment);

      timeline.push({
        "stimulus": "",
        "type": "html-keyboard-response",
        "prompt": params.instructions.circle_text,
        "trial_duration": 2000,
        "choices": jsPsych.NO_KEYS
      });

      _.each(stimuli, function(stimulus, i) {
        var trial = makeTrial(_.object(["id", "audio", "condition", "experiment"], stimulus), i);
        if(trial) { timeline.push(trial); }
      });

    }

    // Function for creating a set of dummy test trials
    var initMockTrials = function() {
      var conditions = experimentData.conditions;
      _.each(conditions, function(condition, i) {
        timeline.push(makeMockTrial(condition, i));
      })
    }

    /* Creates a single experimental trial
     * Trials consitist of
          1. A fixation point
          2. An audio stimulus
          3. A likert scale
    */
    var makeTrial = function(stimulus, i) {

      var audio;

      if(_.contains(params.filler_conditions, stimulus.condition)) {
        audio = params.file_locations.fillers + stimulus.audio;
      } else if(_.contains(params.experimental_conditions, stimulus.condition)) {
        audio = params.file_locations.critical + stimulus.audio;
      } else {
        audio = params.file_locations.subexperiment + stimulus.audio;
      }

      return ({
        "type": "html-keyboard-response",
        "timeline": [
          {
            on_start: function(trial) {
              ExperimentRecorder.addEvent(stimulus.condition);
            },
            "stimulus": "",
            "prompt": "<div class='experiment-point'></div>",
            "trial_duration": 1000,
            "choices": jsPsych.NO_KEYS,
            on_finish: function(){
              jsPsych.data.get().addToLast({
                trial_num: i,
                id: stimulus.id,
                audio: stimulus.audio,
                experiment: stimulus.experiment,
                condition: stimulus.condition,
                trial_type_exp: 'pre-audio'
              });
            }
          },
          {
            "type": "audio-keyboard-response",
            "stimulus": audio,
            "prompt": "<div class='experiment-point'></div>",
            "trial_ends_after_audio": true,
            "choices": jsPsych.NO_KEYS,
            on_finish: function(){
              jsPsych.data.get().addToLast({
                trial_num: i,
                id: stimulus.id,
                audio: stimulus.audio,
                experiment: stimulus.experiment,
                condition: stimulus.condition,
                trial_type_exp: 'audio'
              });
            }
          },
          {
            "stimulus": "",
            "prompt": "<div class='experiment-point'></div>",
            "trial_duration": 1000,
            "choices": jsPsych.NO_KEYS,
            on_finish: function(){
              jsPsych.data.get().addToLast({
                trial_num: i,
                id: stimulus.id,
                audio: stimulus.audio,
                experiment: stimulus.experiment,
                condition: stimulus.condition,
                trial_type_exp: 'post-audio'
              });
            }
          },
          {
            on_start: function(trial) {
              ExperimentRecorder.addEvent("Response");
            },
            "type": "html-keyboard-response",
            "stimulus": params.trial_instructions.stimulus,
            "prompt": params.trial_instructions.prompt,
            "response_ends_trial": true,
            choices: ["1", "2", "3", "4", "5", "6", "7"],
            on_finish: function(){
              var data = jsPsych.data.getLastTrialData().values()[0];
              var resp = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
              jsPsych.data.get().addToLast({
                trial_num: i,
                key_press_processed: resp,
                id: stimulus.id,
                audio: stimulus.audio,
                experiment: stimulus.experiment,
                condition: stimulus.condition,
                trial_type_exp: 'response'
              });

              console.log(data.trial_num);
              if(data.trial_num % 6 == 0 || data.trial_num == 32) {
                saveData(jsPsych.data.get().csv(), dataRef);
              if(data.trial_num == 114) {
                  addWorker(params.workerId, "ak_qrp_");
                }
              }
            }
          }
        ]
      });

    }

    // Creates a single dummy trial
    var makeMockTrial = function(condition, i) {
      return ({
        "type": "html-keyboard-response",
        "timeline": [
          {
            on_start: function(trial) {
              ExperimentRecorder.addEvent(condition);
            },
            "stimulus": "",
            "prompt": params.instructions.circle_text,
            "trial_duration": 500,
            "choices": jsPsych.NO_KEYS,
            on_finish: function(){
              jsPsych.data.get().addToLast({
                trial_num: i,
                id: 'NA',
                audio: 'beep',
                experiment: 'NA',
                condition: 'NA',
                trial_type_exp: 'pre-audio'
              });
            }
          },
          {
            "type": "audio-keyboard-response",
            "stimulus": 'resources/sound/beep.wav',
            "prompt": params.instructions.circle_text,
            "trial_ends_after_audio": true,
            "choices": jsPsych.NO_KEYS,
            on_finish: function(){
              jsPsych.data.get().addToLast({
                trial_num: i,
                id: 'NA',
                audio: 'beep',
                experiment: 'NA',
                condition: 'NA',
                trial_type_exp: 'audio'
              });
            }
          },
          {
            "stimulus": "",
            "prompt": params.instructions.circle_text,
            "trial_duration": 500,
            "choices": jsPsych.NO_KEYS,
            on_finish: function(){
              jsPsych.data.get().addToLast({
                trial_num: i,
                id: 'NA',
                audio: 'beep',
                experiment: 'NA',
                condition: 'NA',
                trial_type_exp: 'post-audio'
              });
            }
          },
          {
            on_start: function(trial) {
              ExperimentRecorder.addEvent("RESP");
            },
            "type": "html-keyboard-response",
            "stimulus": params.trial_instructions.stimulus,
            "prompt": params.trial_instructions.prompt,
            "response_ends_trial": true,
            choices: ["1", "2", "3", "4", "5", "6", "7"],
            on_finish: function(){
              var data = jsPsych.data.getLastTrialData().values()[0];
              var resp = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
              jsPsych.data.get().addToLast({
                trial_num: i,
                id: 'NA',
                audio: 'beep',
                experiment: 'NA',
                condition: 'NA',
                trial_type_exp: 'response'
              });
            }
          }
        ]
      });
    }


    /***************************
    * Post-experiment
    ****************************/

    // Use this function to create any trials that should appear after the main
    // experiment, but BEFORE a redirect.
    var initPostExperiment = function() {
      var end = {
          "type": "instructions",
            "key_forward": " ",
          "show_clickable_nav": true,
          "allow_backward": false,
          "pages": params.instructions.saveBehavioral,
          on_start: function() { saveDataToStorage(jsPsych.data.get().csv(), data.storageLocation) }
      }

      timeline.push(end);
    }
};
