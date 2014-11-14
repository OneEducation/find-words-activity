define(function (require) {

    require("easel");
    require("tween");
    require("preload");

    wordlist = {};

    var padding = 10;

    function WordListView(canvas, game) {

        this.canvas = canvas;
        this.game = game;
        this.selectedWord = null;
        this.onAnimation = false;
        this.noMoreSpace = false;
        var onAndroid = /Android/i.test(navigator.userAgent);

        this.stage = new createjs.Stage(this.canvas);
        this.stage.enableMouseOver(20);

        this.handleComplete = function (event) {
            var queue = event.target;
            this.deleteButton = new createjs.Container();
            var minus = queue.getResult("minus")

            this.deleteButtonImg = new createjs.Bitmap(minus);
            this.deleteButton.visible = false;
            this.deleteButton.addChild(this.deleteButtonImg);
            this.stage.addChild(this.deleteButton);

            this.deleteButton.on('click', this.deleteButtonCb, this);

        };

        queue = new createjs.LoadQueue(false);
        queue.on("complete", this.handleComplete, this);
        queue.loadFile({id:"minus", src:"icons/minus.png"});

        createjs.Ticker.addEventListener("tick", this.stage);

        var shadow_width = 10
        // add a background
        this.background = new createjs.Shape();
        this.background.graphics.beginFill(
            createjs.Graphics.getRGB(0xe0e0e0)
            ).drawRect(
            0, 0, this.canvas.width - shadow_width, this.canvas.height);
        this.stage.addChild(this.background);

        this.rightBorder = new createjs.Shape();
        this.rightBorder.graphics.beginLinearGradientFill(
            ["#aaaaaa", "#ffffff"], [0, 1],
            this.canvas.width - shadow_width, 0,
            this.canvas.width, 0).drawRect(
            this.canvas.width - shadow_width, 0,
            this.canvas.width, this.canvas.height);
        this.stage.addChild(this.rightBorder);

        this.wordHeight = 50;
        this.minimalSpace = this.wordHeight;
        if (onAndroid) {
            // on android we need more space, because the buttons are not in
            // the toolbar, but over the listview canvas
            this.minimalSpace = this.wordHeight * 2;
        }

        this.stage.on('click', function (event) {
            if (this.game.started) {
                return;
            };

            if (event.target == this.background) {
                this.deleteButton.visible = false;
                this.selectedWord = null;
            };
        }, this);

        this.deleteButtonCb = function (event) {
            if (this.game.started) {
                return;
            };

            if (this.selectedWord != null) {
                this.game.removeWord(this.selectedWord.word);

                this.stage.removeChild(this.selectedWord);
                this.deleteButton.visible = false;

                var found = false;
                // animate the pending blocks
                var delay = 100;
                var wordElementIndex = -1;
                for (var n = 0; n < this.wordElements.length; n++) {
                    var textElement = this.wordElements[n];
                    if (textElement.text.toUpperCase() ==
                        this.selectedWord.word) {
                        found = true;
                        wordElementIndex = n;
                    };
                    if (found) {
                        var cont = textElement.parent;
                        var y_final_position = cont.y + this.wordHeight;
                        createjs.Tween.get(cont).wait(delay).to(
                            {y:y_final_position}, 1000,
                            createjs.Ease.bounceOut);
                        delay = delay + 100;
                    };
                };
                if (wordElementIndex > -1) {
                    this.wordElements.splice(wordElementIndex, 1);
                };
                this.selectedWord = null;
                this.noMoreSpace = false;
            };
        };

        this.deleteAllWords = function () {
            for (var i = 0;i < this.wordElements.length; i++) {
                var textElement = this.wordElements[i];
                this.stage.removeChild(textElement.parent);
            };
            this.stage.update();
            this.wordElements = [];
            this.selectedWord = null;
            this.noMoreSpace = false;
            this.deleteButton.visible = false;
        };

        // the stage elements displaying every word in the word list
        this.wordElements = [];

        this.addWords = function (words) {
            if (words.length == 0) {
                this.onAnimation = false;
                return;
            };
            this.onAnimation = true;

            var delay = 0;
            for (var n = 0; n < words.length; n++) {
                var word = words[n];
                var cont = new createjs.Container();
                cont.x = 20; // margin_x;
                cont.y = 0;
                cont.mouseChildren = false;
                cont.visible = false;

                var text = this.addRoundedLabel(cont, word);
                cont.word = word.toUpperCase();

                this.stage.addChild(cont);

                this.wordElements.push(text);

                var yFinalPosition = this.canvas.height - this.wordHeight * 
                    (this.wordElements.length);

                if (yFinalPosition < this.minimalSpace) {
                    this.noMoreSpace = true;
                }

                createjs.Tween.get(cont).wait(delay).call(function() {
                    this.visible = true}).to(
                    {y:yFinalPosition}, 1300,
                    createjs.Ease.bounceOut);
                delay = delay + 400;
            };

            createjs.Tween.get(this.stage).wait(3000).call(
                function() {this.onAnimation = false}, [], this);
        };

        this.maxNumberOfWords = function() {
            return Math.round((this.canvas.height - this.minimalSpace) /
                              this.wordHeight);
        };

        this.addRoundedLabel = function(cont, word) {
            var label;
            if (this.game.lowerCase) {
                label = word.toLowerCase();
            } else {
                label = word.toUpperCase();
            };

            var alpha = 1.0;
            if (this.game.found.indexOf(word.toUpperCase()) > -1) {
                alpha = 0.25;
            };

            var text = new createjs.Text(label, "24px Arial", "#000000");
            text.x = text.getMeasuredWidth() / 2 + padding;
            text.y = padding;
            text.textAlign = "center";

            var box = new createjs.Shape();
            box.graphics.beginFill(this.game.getWordColor(word, alpha)
                ).drawRoundRect(0, 0,
                           text.getMeasuredWidth() + padding * 2,
                           text.getMeasuredHeight()+ padding * 2, 20);
            cont.addChild(box);
            cont.addChild(text);

            cont.cache(0, 0,
                           text.getMeasuredWidth() + padding * 2,
                           text.getMeasuredHeight()+ padding * 2);
            cont.width = text.getMeasuredWidth() + padding * 2;
            cont.height = text.getMeasuredHeight()+ padding * 2;

            cont.on('click', this.selectWordCb, this);
            cont.on('rollover', this.selectWordCb, this);

            return text;
        };

        this.selectWordCb = function (event) {
            // if the game already started or the words are falling,
            // do nothing
            if (this.game.started || this.onAnimation) {
                return;
            };

            if (event.target != this.selectedWord) {
                cont = event.target;
                this.selectedWord = cont;
                // set the position of deleteButton and make visible
                this.deleteButton.y = cont.y;
                this.deleteButton.x = cont.x + cont.width + padding;

                rect = this.deleteButtonImg.getBounds();
                scale = cont.height / rect.height;
                this.deleteButtonImg.scaleX = scale;
                this.deleteButtonImg.scaleY = scale;

                this.deleteButton.visible = true;
            };
        };

        this.changeCase = function () {
            this.deleteButton.visible = false;
            this.updateAll();
        };

        this.updateWord = function (foundWord) {
            for (var i = 0; i < this.wordElements.length; i++) {
                var word = this.wordElements[i];
                if (word.text.toUpperCase() == foundWord) {
                    var cont = word.parent;
                    cont.removeAllChildren();
                    var text = this.addRoundedLabel(cont, foundWord);
                    // update the reference in wordList
                    this.wordElements[i] = text;
                    this.stage.update();
                    break;
                };
            };
        };

        this.updateAll = function () {
            for (var i = 0; i < this.wordElements.length; i++) {
                var word = this.wordElements[i];
                var text = word.text;
                var cont = word.parent;
                cont.removeAllChildren();
                // update the reference in wordList
                this.wordElements[i] = this.addRoundedLabel(cont, text, 1);
            };
            this.stage.update();
        };

        this.gameStarted = function() {
            this.deleteButton.visible = false;
        };

    };

    wordlist.View = WordListView;

    return wordlist;
});
