import pygame
import random

# Screen dimensions
WIDTH = 800
HEIGHT = 600

# Define colors
WHITE = (255, 255, 255)
RED = (255, 0, 0)

class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface([20, 20])
        self.image.fill(RED)
        self.rect = self.image.get_rect()

    def update(self):
        pos = pygame.mouse.get_pos()
        self.rect.x = pos[0]

class Block(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface([20, 20])
        self.image.fill(WHITE)
        self.rect = self.image.get_rect()

    def update(self):
        self.rect.y += 1
        if self.rect.y > HEIGHT:
            self.rect.y = random.randrange(-10, 0)
            self.rect.x = random.randrange(0, WIDTH)

# Initialize Pygame
pygame.init()

# Set up the display
screen = pygame.display.set_mode((WIDTH, HEIGHT))

# Create sprite groups
all_sprites = pygame.sprite.Group()
blocks = pygame.sprite.Group()

# Create the player
player = Player()
all_sprites.add(player)

# Create the blocks
for i in range(50):
    block = Block()
    block.rect.x = random.randrange(WIDTH)
    block.rect.y = random.randrange(HEIGHT)
    all_sprites.add(block)
    blocks.add(block)

# Game loop
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    all_sprites.update()

    # Check if a block has collided with the player
    hits = pygame.sprite.spritecollide(player, blocks, False)
    if hits:
        running = False

    screen.fill((0, 0, 0))
    all_sprites.draw(screen)
    pygame.display.flip()

pygame.quit()